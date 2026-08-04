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
    public string bossDatasetId = "boss_unknown";

    [Header("Player Reference")]
    public PlayerController player;

    // --- Request/response classes — same shape as MLPuzzleUI, plus
    //     problem_type is now player-selected instead of level-derived ---

    [Serializable]
    private class PreprocessRequestBody
    {
        public string dataset;
        public bool drop_duplicates;
        public string missing_strategy;
        public bool encode_categorical;
        public bool scale_features;
    }

    [Serializable]
    private class PreprocessResponseBody
    {
        public int row_count;
        public int missing_count;
        public int duplicate_count;
        public string preview;
    }

    [Serializable]
    private class TrainRequestBody
    {
        public string dataset;
        public string problem_type;
        public string algorithm;
        public bool drop_duplicates;
        public string missing_strategy;
        public bool encode_categorical;
        public bool scale_features;
    }

    [Serializable]
    private class TrainResponseBody
    {
        public string door_status;
        public float metric_value;
        public float metric_target;
        public string metric_name;
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
                yield break;
            }

            TrainResponseBody response = JsonUtility.FromJson<TrainResponseBody>(request.downloadHandler.text);
            bool unlocked = response.door_status == "UNLOCKED";
            _submitted = true;

            if (resultText != null)
            {
                resultText.text = unlocked
                    ? $"CONTAINMENT BREACHED — YOU ESCAPE\n{response.metric_name}: {response.metric_value:F3} (target: {response.metric_target:F3})"
                    : $"SOLUTION REJECTED\n{response.metric_name}: {response.metric_value:F3} (target: {response.metric_target:F3})";
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
