// BossPuzzleUI.cs — BlackVault Boss Room
//
// Extends the Level 1-5 puzzle flow with two boss-specific mechanics:
//   1. A visible countdown timer — running out = automatic fail.
//   2. No pre-known problem type — the player must pick "regression /
//      classification / clustering / anomaly_detection" themselves
//      before choosing an algorithm, since the boss dataset is unknown.
//
// This is a SEPARATE script from MLPuzzleUI.cs rather than a modification
// of it, because the boss's rules are genuinely different (timed, no
// hints) and keeping them separate means you can freely tune boss
// difficulty without risking breaking the levels that already work.
//
// FIELD NAMES: corrected to match backend/main.py's real PreprocessRequest/
// TrainRequest/TrainResponse Pydantic models exactly (remove_duplicates,
// outlier_strategy, encoding, scaling / achieved, passed, door_status).
//
// FIX (this version): TrainRequestBody was missing the "encoding" field
// even though RunTrainSequence() sets it — that caused CS0117
// "TrainRequestBody does not contain a definition for 'encoding'".
// Added it below alongside the other preprocessing fields.
//
// ⚠ BACKEND GAP: main.py's MISSION_POOL currently only defines levels 1-5.
// There is no "boss" entry and no /mission/generate support for it, and
// no "boss_unknown" dataset exists in backend/data/. This script will
// compile and run, but /preprocess and /train calls for the boss will
// fail with a 404 ("Dataset not found") until you either:
//   (a) add a boss dataset + endpoint (see gen_boss_dataset() already
//       written in generate_datasets.py, but not yet wired into main.py), or
//   (b) point bossDatasetId at an existing dataset for testing purposes.
//
// Setup in Unity:
//   Same general pattern as MLPuzzleUI — build a Canvas_BossPuzzle with
//   the same UI elements PLUS:
//     - TimerText (Text) — shows remaining seconds
//     - ProblemTypeDropdown (Dropdown) — regression/classification/
//       clustering/anomaly_detection, player picks BEFORE algorithm
//   Wire it to a Terminal_Boss the same way MLPuzzleUI is wired to
//   Terminal_01, but reference BossPuzzleUI instead.

using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.UI;

public class BossPuzzleUI : MonoBehaviour
{
    private const string BaseUrl = "http://127.0.0.1:8000";

    [Header("Panel Root")]
    public GameObject panelRoot;

    [Header("UI References")]
    public Text datasetPreviewText;
    public Text statsText;
    public Toggle dropDuplicatesToggle;
    public Toggle fillMissingToggle;
    public Toggle encodeToggle;
    public Toggle scaleToggle;
    public Dropdown problemTypeDropdown; // NEW — boss-only, player self-diagnoses
    public Dropdown algorithmDropdown;
    public Text resultText;
    public Text timerText;               // NEW — boss-only countdown display
    public Button runButton;
    public Button closeButton;

    [Header("Boss Settings")]
    public float timeLimitSeconds = 180f; // 3 minutes — tune to taste
    [Tooltip("See the backend-gap warning at the top of this file — this dataset doesn't exist in main.py yet.")]
    public string bossDatasetId = "boss_unknown";

    [Header("Player Reference")]
    public PlayerController player;

    // --- Request/response classes — field names match backend/main.py exactly ---

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
        // "cols", "dtypes", "preview" intentionally omitted — JsonUtility
        // can't deserialize dicts/heterogeneous lists. See MLPuzzleUI.cs
        // header comment for the full explanation.
    }

    [Serializable]
    private class TrainRequestBody
    {
        public string dataset;
        public string problem_type;
        public string algorithm;
        public string target_metric = "accuracy";
        public float target_metric_value = 0.75f;
        public string metric_direction = "higher_is_better";
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
    }

    private Action<bool> _onResultCallback;
    private Coroutine _timerCoroutine;
    private float _timeRemaining;
    private bool _submitted;

    private static readonly string[] ProblemTypes =
        { "regression", "classification", "clustering", "anomaly_detection" };

    private void Awake()
    {
        if (panelRoot != null) panelRoot.SetActive(false);
        if (runButton != null) runButton.onClick.AddListener(OnRunClicked);
        if (closeButton != null) closeButton.onClick.AddListener(OnForceClose);

        if (problemTypeDropdown != null)
        {
            problemTypeDropdown.ClearOptions();
            problemTypeDropdown.AddOptions(new System.Collections.Generic.List<string>(ProblemTypes));
            problemTypeDropdown.onValueChanged.AddListener(OnProblemTypeChanged);
        }
    }

    public void Open(Action<bool> onResult)
    {
        _onResultCallback = onResult;
        _submitted = false;
        _timeRemaining = timeLimitSeconds;

        if (panelRoot != null) panelRoot.SetActive(true);
        if (player != null) player.SetInputEnabled(false);
        if (resultText != null) resultText.text = "";
        if (statsText != null) statsText.text = "";

        // No hint given — player sees raw data only, must decide the
        // problem type themselves before algorithm options populate.
        OnProblemTypeChanged(0);
        StartCoroutine(FetchPreview());

        if (_timerCoroutine != null) StopCoroutine(_timerCoroutine);
        _timerCoroutine = StartCoroutine(RunTimer());
    }

    public void Close()
    {
        if (_timerCoroutine != null) StopCoroutine(_timerCoroutine);
        if (panelRoot != null) panelRoot.SetActive(false);
        if (player != null) player.SetInputEnabled(true);
    }

    private void OnForceClose()
    {
        // Leaving early counts as a failed attempt — no free retries
        // mid-timer for the boss, unlike the earlier levels.
        Close();
        _onResultCallback?.Invoke(false);
    }

    private IEnumerator RunTimer()
    {
        while (_timeRemaining > 0f && !_submitted)
        {
            _timeRemaining -= Time.deltaTime;
            if (timerText != null)
            {
                int seconds = Mathf.Max(0, Mathf.CeilToInt(_timeRemaining));
                timerText.text = $"TIME REMAINING: {seconds}s";
                timerText.color = seconds <= 30 ? Color.red : Color.white;
            }
            yield return null;
        }

        if (!_submitted)
        {
            // Time ran out before the player submitted a solution.
            if (resultText != null) resultText.text = "TIME EXPIRED — LOCKDOWN CONTINUES";
            _submitted = true;
            yield return new WaitForSeconds(2f);
            Close();
            _onResultCallback?.Invoke(false);
        }
    }

    private void OnProblemTypeChanged(int index)
    {
        string problemType = ProblemTypes[Mathf.Clamp(index, 0, ProblemTypes.Length - 1)];
        PopulateAlgorithmOptions(problemType);
    }

    private void PopulateAlgorithmOptions(string problemType)
    {
        if (algorithmDropdown == null) return;
        algorithmDropdown.ClearOptions();

        System.Collections.Generic.List<string> options;
        switch (problemType)
        {
            case "regression":
                options = new System.Collections.Generic.List<string>
                    { "linear_regression", "decision_tree", "random_forest", "xgboost" };
                break;
            case "classification":
                options = new System.Collections.Generic.List<string>
                    { "logistic_regression", "decision_tree", "random_forest", "svm", "xgboost" };
                break;
            case "clustering":
                options = new System.Collections.Generic.List<string> { "kmeans", "dbscan" };
                break;
            case "anomaly_detection":
                options = new System.Collections.Generic.List<string>
                    { "isolation_forest", "one_class_svm" };
                break;
            default:
                options = new System.Collections.Generic.List<string> { "n/a" };
                break;
        }
        algorithmDropdown.AddOptions(options);
    }

    private IEnumerator FetchPreview()
    {
        PreprocessRequestBody body = new PreprocessRequestBody
        {
            dataset = bossDatasetId,
            missing_strategy = "fill_median",
            remove_duplicates = false, // show RAW stats first
            outlier_strategy = "none",
            encoding = "none",
            scaling = "none",
        };

        yield return SendPreprocess(body, response =>
        {
            if (statsText != null)
            {
                statsText.text = $"Rows: {response.rows_before} | Missing: {response.missing_before}";
            }
            if (datasetPreviewText != null)
            {
                datasetPreviewText.text = "UNKNOWN SIGNAL DETECTED — diagnose the problem type before proceeding.";
            }
        });
    }

    private void OnRunClicked()
    {
        if (_submitted) return; // one shot — no resubmitting after time runs out
        StartCoroutine(RunTrainSequence());
    }

    private IEnumerator RunTrainSequence()
    {
        if (resultText != null) resultText.text = "Training...";

        string chosenProblemType = ProblemTypes[Mathf.Clamp(
            problemTypeDropdown != null ? problemTypeDropdown.value : 0, 0, ProblemTypes.Length - 1)];

        TrainRequestBody body = new TrainRequestBody
        {
            dataset = bossDatasetId,
            problem_type = chosenProblemType,
            algorithm = algorithmDropdown != null ? algorithmDropdown.options[algorithmDropdown.value].text : "",
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
                yield break;
            }

            TrainResponseBody response = JsonUtility.FromJson<TrainResponseBody>(request.downloadHandler.text);
            bool unlocked = response.door_status == "UNLOCKED";
            _submitted = true;

            if (resultText != null)
            {
                resultText.text = unlocked
                    ? $"CONTAINMENT BREACHED — YOU ESCAPE\n{response.target_metric}: {response.achieved:F3} (target: {response.target_value:F3})"
                    : $"SOLUTION REJECTED\n{response.target_metric}: {response.achieved:F3} (target: {response.target_value:F3})";
            }

            yield return new WaitForSeconds(2.5f);
            Close();
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
                if (statsText != null) statsText.text = "Failed to load dataset preview.";
                yield break;
            }

            PreprocessResponseBody response = JsonUtility.FromJson<PreprocessResponseBody>(request.downloadHandler.text);
            onSuccess?.Invoke(response);
        }
    }
}