// MLPuzzleUI.cs — BlackVault
//
// CODE-EDITOR VERSION — replaces the earlier toggle/dropdown puzzle UI.
// The player now writes real Python (pandas/sklearn) against the raw
// dataset, in a syntax-highlighted editor, and it executes server-side
// via POST /train/code (see backend/services/code_executor.py for the
// exact contract of what variables the code must set).
//
// Flow: Open(level) -> fetch mission config from /mission/generate ->
// fetch raw dataset stats from /preprocess (no transformations, just
// for display) -> populate the code editor with a starter template ->
// player edits and clicks Run -> POST /train/code -> show result.
//
// Setup in Unity:
//   1. Build the panel with: a mission info Text, a stats Text, a
//      CodeEditorField (see that script's own setup instructions for
//      the TMP_InputField + overlay wiring), a Run button, a Close
//      button, and a result Text.
//   2. Attach this script to the Canvas/panel root.
//   3. Wire every field below to the matching UI element in the Inspector.

using System;
using System.Collections;
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
    public Text missionInfoText;      // title + description from the mission config
    public Text statsText;            // raw row/missing count, informational only
    public CodeEditorField codeEditor; // the syntax-highlighted code editor (see CodeEditorField.cs)
    public Text resultText;
    public Button runButton;
    public Button closeButton;

    [Header("Player Reference")]
    public PlayerController player;

    // ------------------------------------------------------------------
    // Data classes — field names match backend/main.py EXACTLY.
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
        public string target_col;
        public string[] feature_cols;
        public string[] algorithms_allowed;
        public string target_metric;
        public float target_metric_value;
        public string metric_direction;
        public int[] k_range;
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
        public bool remove_duplicates = false;
        public string outlier_strategy = "none";
        public string encoding = "none";
        public string scaling = "none";
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
    }

    [Serializable]
    private class CodeExecuteRequestBody
    {
        public string dataset;
        public string problem_type;
        public string code;
        public string target_col;
        public string[] feature_cols;
        public string target_metric = "accuracy";
        public float target_metric_value = 0.75f;
        public string metric_direction = "higher_is_better";
    }

    [Serializable]
    private class CodeExecuteResponseBody
    {
        public string target_metric;
        public float target_value;
        public float achieved;
        public bool passed;
        public string door_status;
        public string error;
    }

    private MissionConfig _mission;
    private Action<bool> _onResultCallback;

    private void Awake()
    {
        if (panelRoot != null) panelRoot.SetActive(false);
        if (runButton != null) runButton.onClick.AddListener(OnRunClicked);
        if (closeButton != null) closeButton.onClick.AddListener(Close);
    }

    public void Open(int level, Action<bool> onResult)
    {
        _onResultCallback = onResult;

        if (panelRoot != null) panelRoot.SetActive(true);
        if (player != null) player.SetInputEnabled(false);

        if (resultText != null) resultText.text = "";
        if (statsText != null) statsText.text = "";
        if (missionInfoText != null) missionInfoText.text = "Loading mission...";
        if (codeEditor != null) codeEditor.Text = "";

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
                if (missionInfoText != null)
                {
                    missionInfoText.text = $"Failed to load mission: {request.error}";
                }
                yield break;
            }

            _mission = JsonUtility.FromJson<MissionConfig>(request.downloadHandler.text);
        }

        if (missionInfoText != null)
        {
            missionInfoText.text = $"{_mission.title}\n\n{_mission.description}";
        }

        if (codeEditor != null)
        {
            codeEditor.Text = BuildStarterTemplate(_mission);
        }

        yield return FetchPreview();
    }

    private string BuildStarterTemplate(MissionConfig mission)
    {
        var sb = new StringBuilder();
        sb.AppendLine("# Available: df (raw data), target_col, feature_cols, pd, np,");
        sb.AppendLine("# train_test_split, and sklearn model classes (see docs).");
        sb.AppendLine($"# Dataset: {mission.dataset}");

        switch (mission.problem_type)
        {
            case "regression":
            case "classification":
                sb.AppendLine("#");
                sb.AppendLine("# Your code must end with these two variables set:");
                sb.AppendLine("#   y_test  -> the true values for a held-out test split");
                sb.AppendLine("#   y_pred  -> your model's predictions on that same split");
                sb.AppendLine();
                sb.AppendLine("# Write your solution below:");
                sb.AppendLine();
                break;
            case "clustering":
                sb.AppendLine("#");
                sb.AppendLine("# Your code must end with this variable set:");
                sb.AppendLine("#   labels  -> one cluster id per row");
                sb.AppendLine();
                sb.AppendLine("# Write your solution below:");
                sb.AppendLine();
                break;
            case "anomaly_detection":
                sb.AppendLine("#");
                sb.AppendLine("# Your code must end with this variable set:");
                sb.AppendLine("#   anomaly_flags  -> 0/1 (or True/False) per row");
                sb.AppendLine();
                sb.AppendLine("# Write your solution below:");
                sb.AppendLine();
                break;
        }

        return sb.ToString();
    }

    private IEnumerator FetchPreview()
    {
        PreprocessRequestBody body = new PreprocessRequestBody { dataset = _mission.dataset };

        yield return SendPreprocess(body, response =>
        {
            if (statsText != null)
            {
                statsText.text = $"Rows: {response.rows_before} | Missing values: {response.missing_before}";
            }
        });
    }

    private void OnRunClicked()
    {
        StartCoroutine(RunCodeSequence());
    }

    private IEnumerator RunCodeSequence()
    {
        if (resultText != null) resultText.text = "Running your code...";

        CodeExecuteRequestBody body = new CodeExecuteRequestBody
        {
            dataset = _mission.dataset,
            problem_type = _mission.problem_type,
            code = codeEditor != null ? codeEditor.Text : "",
            target_col = _mission.target_col,
            feature_cols = _mission.feature_cols,
            target_metric = string.IsNullOrEmpty(_mission.target_metric) ? "accuracy" : _mission.target_metric,
            target_metric_value = _mission.target_metric_value > 0 ? _mission.target_metric_value : 0.75f,
            metric_direction = string.IsNullOrEmpty(_mission.metric_direction) ? "higher_is_better" : _mission.metric_direction,
        };

        string jsonBody = JsonUtility.ToJson(body);
        byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);

        using (UnityWebRequest request = new UnityWebRequest($"{BaseUrl}/train/code", "POST"))
        {
            request.uploadHandler = new UploadHandlerRaw(bodyRaw);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");

            yield return request.SendWebRequest();

            if (request.result != UnityWebRequest.Result.Success)
            {
                if (resultText != null) resultText.text = $"Connection error: {request.error}";
                Debug.LogError($"[BlackVault] /train/code FAILED: {request.error}\n{request.downloadHandler.text}");
                yield break;
            }

            CodeExecuteResponseBody response = JsonUtility.FromJson<CodeExecuteResponseBody>(request.downloadHandler.text);
            bool unlocked = response.door_status == "UNLOCKED";

            if (resultText != null)
            {
                if (!string.IsNullOrEmpty(response.error))
                {
                    resultText.text = $"ERROR:\n{response.error}";
                }
                else
                {
                    resultText.text = unlocked
                        ? $"ACCESS GRANTED\n{response.target_metric}: {response.achieved:F3} (target: {response.target_value:F3})"
                        : $"ACCESS DENIED\n{response.target_metric}: {response.achieved:F3} (target: {response.target_value:F3})";
                }
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