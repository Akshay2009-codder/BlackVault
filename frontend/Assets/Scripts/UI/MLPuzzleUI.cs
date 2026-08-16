// MLPuzzleUI.cs — BlackVault
//
// CORRECTED VERSION — matches the actual backend/main.py field names
// and request/response shapes (verified against the real Pydantic
// models, not guessed). Key differences from the earlier draft:
//
//   1. Fetches the mission config from GET /mission/generate?level=N
//      FIRST, and uses ITS dataset/target_col/feature_cols/target_metric/
//      algorithms_allowed — these were previously hardcoded guesses in
//      Unity that had no connection to the actual mission pool in
//      main.py. That was a real bug: a level 3 request could have sent
//      the wrong target_col and crashed the backend with a KeyError.
//   2. Field names now match PreprocessRequest/TrainRequest exactly:
//      remove_duplicates (not drop_duplicates), outlier_strategy,
//      encoding, scaling — all matching main.py's Pydantic models.
//   3. Train response now reads achieved / passed / target_metric /
//      target_value / door_status — matching what /train actually
//      returns, not the metric_value/metric_name fields that were
//      never real.
//   4. The algorithm dropdown is now populated from the mission's
//      algorithms_allowed list (dynamic), not a hardcoded C# switch —
//      so if you change MISSION_POOL in main.py, Unity adapts
//      automatically with no code change needed.
//   5. JsonUtility CANNOT deserialize dictionaries or heterogeneous
//      list-of-dicts (Unity limitation, not a bug) — so "preview",
//      "dtypes", and "metrics" from the backend responses are
//      intentionally NOT declared as C# fields. JsonUtility silently
//      ignores JSON fields with no matching C# field, so this is safe;
//      it just means we can't show the literal row-by-row data preview
//      table without adding a JSON library like Newtonsoft/Json.NET.
//      The UI shows the numeric stats instead (rows/missing/duplicates),
//      which is what actually drives player decisions anyway.
//
// FIX (this version): TrainRequestBody was missing the "encoding" field
// even though RunTrainSequence() sets it — that caused CS0117
// "MLPuzzleUI.TrainRequestBody does not contain a definition for
// 'encoding'". Added it below alongside the other preprocessing fields.

using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;

public class MLPuzzleUI : MonoBehaviour
{
    private const string BaseUrl = "http://127.0.0.1:8000";

    [Header("Panel Root")]
    public GameObject panelRoot;

    [Header("UI References")]
    public Text datasetPreviewText;   // now shows a text summary, not a literal row table (see note above)
    public Text statsText;
    public Toggle dropDuplicatesToggle; // -> remove_duplicates
    public Toggle fillMissingToggle;    // on = "fill_median", off = "drop_rows"
    public Toggle encodeToggle;         // on = "label", off = "none"
    public Toggle scaleToggle;          // on = "standard", off = "none"
    public Dropdown algorithmDropdown;  // populated dynamically from mission.algorithms_allowed
    public Text resultText;
    public Button runButton;
    public Button closeButton;

    [Header("Player Reference")]
    public PlayerController player;

    // ------------------------------------------------------------------
    // Data classes — field names match backend/main.py EXACTLY.
    // Do not rename these without also updating main.py, or vice versa.
    // ------------------------------------------------------------------

    [Serializable]
    private class MissionConfig
    {
        public string mission_id;
        public int level;
        public string title;
        public string description;
        public string problem_type;
        public string dataset;
        public string target_col;          // absent (null) for cleaning-only levels
        public string[] feature_cols;      // may be null — backend falls back to "all columns except target"
        public string[] algorithms_allowed; // absent for cleaning-only levels
        public string target_metric;
        public float target_metric_value;
        public string metric_direction;
        public int[] k_range;              // clustering only
        public string difficulty;
        public int time_limit_seconds;
        public int max_retries;
        public bool hints_available;
    }

    [Serializable]
    private class PreprocessRequestBody
    {
        public string dataset;
        public string missing_strategy = "fill_median";
        public bool remove_duplicates = true;
        public string outlier_strategy = "clip_iqr";
        public string encoding = "label";
        public string scaling = "standard";
    }

    [Serializable]
    private class PreprocessResponseBody
    {
        public string dataset;
        public int rows_before;
        public int rows_after;
        public int missing_before;
        public int missing_after;
        public int duplicates_removed;
        // "cols", "dtypes", "preview" intentionally omitted — see note at top of file.
    }

    [Serializable]
    private class TrainRequestBody
    {
        public string dataset;
        public string problem_type;
        public string algorithm;
        public string target_col;
        public string[] feature_cols;
        public string target_metric = "accuracy";
        public float target_metric_value = 0.75f;
        public string metric_direction = "higher_is_better";
        public int k = 5;
        public string missing_strategy = "fill_median";
        public bool remove_duplicates = true;
        public string outlier_strategy = "clip_iqr";
        public string encoding = "label";   // <-- FIX: was missing, caused CS0117
        public string scaling = "standard";
    }

    [Serializable]
    private class TrainResponseBody
    {
        public string target_metric;
        public float target_value;
        public float achieved;
        public bool passed;
        public string door_status; // "UNLOCKED" | "LOCKED"
        // "metrics" (a dict) intentionally omitted — see note at top of file.
    }

    private MissionConfig _mission;
    private Action<bool> _onResultCallback;

    private void Awake()
    {
        if (panelRoot != null) panelRoot.SetActive(false);
        if (runButton != null) runButton.onClick.AddListener(OnRunClicked);
        if (closeButton != null) closeButton.onClick.AddListener(Close);
    }

    /// <summary>
    /// Called by TerminalInteractable when the player interacts with a terminal.
    /// Note the signature change: only `level` is needed now — the dataset,
    /// target column, feature columns, and allowed algorithms all come from
    /// the backend's mission config, not from Unity-side guesses.
    /// </summary>
    public void Open(int level, Action<bool> onResult)
    {
        _onResultCallback = onResult;

        if (panelRoot != null) panelRoot.SetActive(true);
        if (player != null) player.SetInputEnabled(false);

        if (resultText != null) resultText.text = "";
        if (statsText != null) statsText.text = "";
        if (datasetPreviewText != null) datasetPreviewText.text = "Loading mission...";

        StartCoroutine(FetchMissionThenPreview(level));
    }

    public void Close()
    {
        if (panelRoot != null) panelRoot.SetActive(false);
        if (player != null) player.SetInputEnabled(true);
    }

    private IEnumerator FetchMissionThenPreview(int level)
    {
        using (UnityWebRequest request = UnityWebRequest.Get($"{BaseUrl}/mission/generate?level={level}"))
        {
            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                if (datasetPreviewText != null)
                {
                    datasetPreviewText.text = $"Failed to load mission: {request.error}";
                }
                yield break;
            }

            _mission = JsonUtility.FromJson<MissionConfig>(request.downloadHandler.text);
        }

        PopulateAlgorithmOptions(_mission.algorithms_allowed);
        yield return FetchPreview();
    }

    private void PopulateAlgorithmOptions(string[] allowed)
    {
        if (algorithmDropdown == null) return;
        algorithmDropdown.ClearOptions();

        List<string> options = (allowed != null && allowed.Length > 0)
            ? new List<string>(allowed)
            : new List<string> { "n/a" }; // e.g. Level 1 (cleaning-only) has no algorithm choice

        algorithmDropdown.AddOptions(options);
        algorithmDropdown.interactable = allowed != null && allowed.Length > 0;
    }

    private IEnumerator FetchPreview()
    {
        PreprocessRequestBody body = new PreprocessRequestBody
        {
            dataset = _mission.dataset,
            missing_strategy = "fill_median",
            remove_duplicates = false, // show RAW stats first, before the player chooses anything
            outlier_strategy = "none",
            encoding = "none",
            scaling = "none",
        };

        yield return SendPreprocess(body, response =>
        {
            if (statsText != null)
            {
                statsText.text = $"Rows: {response.rows_before} | Missing values: {response.missing_before}";
            }
            if (datasetPreviewText != null)
            {
                datasetPreviewText.text = $"{_mission.title}\n\n{_mission.description}";
            }
        });
    }

    private void OnRunClicked()
    {
        StartCoroutine(RunTrainSequence());
    }

    private IEnumerator RunTrainSequence()
    {
        if (resultText != null) resultText.text = "Training...";

        TrainRequestBody body = new TrainRequestBody
        {
            dataset = _mission.dataset,
            problem_type = _mission.problem_type,
            algorithm = (algorithmDropdown != null && algorithmDropdown.options.Count > 0)
                ? algorithmDropdown.options[algorithmDropdown.value].text
                : "",
            target_col = _mission.target_col,
            feature_cols = _mission.feature_cols,
            target_metric = string.IsNullOrEmpty(_mission.target_metric) ? "accuracy" : _mission.target_metric,
            target_metric_value = _mission.target_metric_value > 0 ? _mission.target_metric_value : 0.75f,
            metric_direction = string.IsNullOrEmpty(_mission.metric_direction) ? "higher_is_better" : _mission.metric_direction,
            k = (_mission.k_range != null && _mission.k_range.Length > 0) ? _mission.k_range[0] : 5,
            remove_duplicates = dropDuplicatesToggle != null && dropDuplicatesToggle.isOn,
            missing_strategy = (fillMissingToggle != null && fillMissingToggle.isOn) ? "fill_median" : "drop_rows",
            outlier_strategy = "clip_iqr",
            encoding = (encodeToggle != null && encodeToggle.isOn) ? "label" : "none",
            scaling = (scaleToggle != null && scaleToggle.isOn) ? "standard" : "none",
        };

        string jsonBody = JsonUtility.ToJson(body);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);

        using (UnityWebRequest request = new UnityWebRequest($"{BaseUrl}/train", "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                if (resultText != null) resultText.text = $"Connection error: {request.error}";
                Debug.LogError($"[BlackVault] /train FAILED: {request.error}\n{request.downloadHandler.text}");
                yield break;
            }

            TrainResponseBody response = JsonUtility.FromJson<TrainResponseBody>(request.downloadHandler.text);
            bool unlocked = response.door_status == "UNLOCKED";

            if (resultText != null)
            {
                resultText.text = unlocked
                    ? $"ACCESS GRANTED\n{response.target_metric}: {response.achieved:F3} (target: {response.target_value:F3})"
                    : $"ACCESS DENIED\n{response.target_metric}: {response.achieved:F3} (target: {response.target_value:F3})";
            }

            if (unlocked)
            {
                yield return new WaitForSeconds(1.5f);
                Close();
            }

            _onResultCallback?.Invoke(unlocked);
        }
    }

    private IEnumerator SendPreprocess(PreprocessRequestBody body, Action<PreprocessResponseBody> onSuccess)
    {
        string jsonBody = JsonUtility.ToJson(body);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);

        using (UnityWebRequest request = new UnityWebRequest($"{BaseUrl}/preprocess", "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError($"[BlackVault] /preprocess FAILED: {request.error}");
                if (statsText != null) statsText.text = "Failed to load dataset preview.";
                yield break;
            }

            PreprocessResponseBody response = JsonUtility.FromJson<PreprocessResponseBody>(request.downloadHandler.text);
            onSuccess?.Invoke(response);
        }
    }
}