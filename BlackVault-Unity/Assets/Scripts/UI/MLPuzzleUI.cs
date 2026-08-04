// MLPuzzleUI.cs — BlackVault Phase 1
//
// This is the actual in-game ML puzzle panel (what ApiTester.cs only
// simulated with console logs). It's opened by TerminalInteractable,
// shows dataset info, lets the player choose preprocessing steps +
// an algorithm, calls the backend, and reports pass/fail back to the
// terminal so the door can unlock.
//
// IMPORTANT — FIELD NAMES:
// The request classes below (PreprocessRequestBody, TrainRequestBody)
// are written to match the shape you described for your Pydantic
// models (PreprocessRequest / TrainRequest in main.py). JsonUtility
// requires EXACT field name matches (case-sensitive) with your FastAPI
// response/request models. Open main.py alongside this file and adjust
// any field names below that don't match your actual Pydantic classes
// before testing — this is the single most common failure point when
// wiring Unity to FastAPI.
//
// Setup in Unity:
//   1. Create a Canvas (screen-space overlay is simplest for a first pass).
//   2. Build a panel with: a dataset preview area (Text/TMP), toggles or
//      buttons for each preprocessing option (drop duplicates, fill
//      missing, encode, scale), a Dropdown for algorithm choice, a
//      "Run" button, and a result Text field.
//   3. Attach this script to the Canvas (or a dedicated empty object).
//   4. Wire up all the public fields below to your actual UI elements.
//   5. Keep the panel disabled by default — Open()/Close() handle visibility.

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
    public GameObject panelRoot; // the whole UI panel, enabled/disabled on Open()/Close()

    [Header("UI References (wire these to your actual UGUI elements)")]
    public Text datasetPreviewText;
    public Text statsText;          // shows row count, missing count, duplicate count after preprocess
    public Toggle dropDuplicatesToggle;
    public Toggle fillMissingToggle;
    public Toggle encodeToggle;
    public Toggle scaleToggle;
    public Dropdown algorithmDropdown; // populate options per problem type when opening
    public Text resultText;
    public Button runButton;
    public Button closeButton;

    [Header("Player Reference")]
    public PlayerController player; // used to freeze movement/unlock cursor while the panel is open

    // --- Data classes matching the backend Pydantic models ---
    // ADJUST FIELD NAMES to exactly match backend/main.py if they differ.

    [Serializable]
    private class PreprocessRequestBody
    {
        public string dataset;
        public bool drop_duplicates;
        public string missing_strategy;   // e.g. "mean", "median", "drop"
        public bool encode_categorical;
        public bool scale_features;
    }

    [Serializable]
    private class PreprocessResponseBody
    {
        public int row_count;
        public int missing_count;
        public int duplicate_count;
        public string preview; // adjust if your backend returns structured rows instead of a string
    }

    [Serializable]
    private class TrainRequestBody
    {
        public string dataset;
        public string problem_type;   // "regression" | "classification" | "clustering" | "anomaly_detection"
        public string algorithm;
        public bool drop_duplicates;
        public string missing_strategy;
        public bool encode_categorical;
        public bool scale_features;
    }

    [Serializable]
    private class TrainResponseBody
    {
        public string door_status;    // "UNLOCKED" | "LOCKED"
        public float metric_value;
        public float metric_target;
        public string metric_name;    // "RMSE" | "accuracy" | "f1" | "silhouette" | ...
    }

    private string _currentDataset;
    private int _currentLevel;
    private string _currentProblemType;
    private Action<bool> _onResultCallback;

    private void Awake()
    {
        if (panelRoot != null) panelRoot.SetActive(false);
        if (runButton != null) runButton.onClick.AddListener(OnRunClicked);
        if (closeButton != null) closeButton.onClick.AddListener(Close);
    }

    /// <summary>
    /// Called by TerminalInteractable when the player interacts with a terminal.
    /// </summary>
    public void Open(string datasetId, int level, Action<bool> onResult)
    {
        _currentDataset = datasetId;
        _currentLevel = level;
        _onResultCallback = onResult;
        _currentProblemType = ProblemTypeForLevel(level);

        if (panelRoot != null) panelRoot.SetActive(true);
        if (player != null) player.SetInputEnabled(false);

        if (resultText != null) resultText.text = "";
        if (statsText != null) statsText.text = "";

        PopulateAlgorithmOptions(_currentProblemType);
        StartCoroutine(FetchPreview());
    }

    public void Close()
    {
        if (panelRoot != null) panelRoot.SetActive(false);
        if (player != null) player.SetInputEnabled(true);
    }

    /// <summary>
    /// Maps level number to problem type. Adjust to match your actual
    /// mission pool config in main.py if the mapping differs.
    /// </summary>
    private string ProblemTypeForLevel(int level)
    {
        switch (level)
        {
            case 1: return "cleaning";
            case 2: return "regression";
            case 3: return "classification";
            case 4: return "clustering";
            case 5: return "anomaly_detection";
            default: return "regression";
        }
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
                    { "linear_regression", "decision_tree", "random_forest" };
                break;
            case "classification":
                options = new System.Collections.Generic.List<string>
                    { "logistic_regression", "decision_tree", "random_forest", "svm" };
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
        // Uses /preprocess with default (no) transformations applied yet,
        // purely to show the player the raw dataset stats before they act.
        PreprocessRequestBody body = new PreprocessRequestBody
        {
            dataset = _currentDataset,
            drop_duplicates = false,
            missing_strategy = "none",
            encode_categorical = false,
            scale_features = false
        };

        yield return SendPreprocess(body, response =>
        {
            if (statsText != null)
            {
                statsText.text = $"Rows: {response.row_count} | Missing: {response.missing_count} | Duplicates: {response.duplicate_count}";
            }
            if (datasetPreviewText != null)
            {
                datasetPreviewText.text = response.preview;
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
            dataset = _currentDataset,
            problem_type = _currentProblemType,
            algorithm = algorithmDropdown != null ? algorithmDropdown.options[algorithmDropdown.value].text : "",
            drop_duplicates = dropDuplicatesToggle != null && dropDuplicatesToggle.isOn,
            missing_strategy = (fillMissingToggle != null && fillMissingToggle.isOn) ? "mean" : "none",
            encode_categorical = encodeToggle != null && encodeToggle.isOn,
            scale_features = scaleToggle != null && scaleToggle.isOn
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
                Debug.LogError($"[BlackVault] /train FAILED: {request.error}");
                yield break;
            }

            TrainResponseBody response = JsonUtility.FromJson<TrainResponseBody>(request.downloadHandler.text);
            bool unlocked = response.door_status == "UNLOCKED";

            if (resultText != null)
            {
                resultText.text = unlocked
                    ? $"ACCESS GRANTED\n{response.metric_name}: {response.metric_value:F3} (target: {response.metric_target:F3})"
                    : $"ACCESS DENIED\n{response.metric_name}: {response.metric_value:F3} (target: {response.metric_target:F3})";
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
