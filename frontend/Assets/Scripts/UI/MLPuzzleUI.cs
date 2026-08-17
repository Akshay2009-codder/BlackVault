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
//   1. Build the panel with: a mission info Text, a stats Text, a plain
//      multi-line InputField (no syntax highlighting — kept simple for
//      reliability), a Run button, a Close button, and a result Text.
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
    public InputField codeEditor; // plain multi-line text box (no syntax highlighting — dropped for reliability/speed)
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
        public string mission_id;
        public string level_id;
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
        EnsurePyCharmStyle();
    }

    public void Open(int level, Action<bool> onResult)
    {
        _onResultCallback = onResult;

        if (panelRoot != null) panelRoot.SetActive(true);
        if (player != null) player.SetInputEnabled(false);

        EnsurePyCharmStyle();

        if (resultText != null) resultText.text = "<color=#7A7E85>PyCharm Console initialized. Click Run to execute script on backend.</color>";
        if (statsText != null) statsText.text = "";
        if (missionInfoText != null) missionInfoText.text = "Loading mission...";
        if (codeEditor != null) codeEditor.text = "";

        StartCoroutine(FetchMissionThenPreview(level));
    }

    private void EnsurePyCharmStyle()
    {
        if (panelRoot == null) return;

        // IMPORTANT: Use ConstantPixelSize — ScaleWithScreenSize with a
        // 1920×1080 reference shrinks everything to microscopic size inside
        // the Unity Game tab (which is much smaller than 1920×1080).
        CanvasScaler scaler = panelRoot.GetComponentInParent<CanvasScaler>();
        if (scaler != null)
        {
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize;
            scaler.scaleFactor = 1f;
        }

        // Use a large monospace font for code readability
        Font monoFont = Font.CreateDynamicFontFromOSFont("Consolas", 20);
        if (monoFont == null) monoFont = Font.CreateDynamicFontFromOSFont("Courier New", 20);
        if (monoFont == null) monoFont = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

        // 1. Panel background — PyCharm Darcula
        Image panelImage = panelRoot.GetComponent<Image>();
        if (panelImage != null)
        {
            panelImage.color = new Color(0.118f, 0.122f, 0.133f, 0.98f);
        }

        RectTransform panelRect = panelRoot.GetComponent<RectTransform>();
        if (panelRect != null)
        {
            panelRect.anchorMin = Vector2.zero;
            panelRect.anchorMax = Vector2.one;
            panelRect.offsetMin = new Vector2(30f, 20f);
            panelRect.offsetMax = new Vector2(-30f, -20f);
        }

        // 2. Mission title — bold, red-orange, top-anchored
        if (missionInfoText != null)
        {
            missionInfoText.font = monoFont;
            missionInfoText.fontSize = 20;
            missionInfoText.lineSpacing = 1.1f;
            missionInfoText.supportRichText = true;
            missionInfoText.alignment = TextAnchor.UpperLeft;
            missionInfoText.color = new Color(0.95f, 0.35f, 0.35f);

            RectTransform rt = missionInfoText.rectTransform;
            rt.anchorMin = new Vector2(0f, 1f);
            rt.anchorMax = new Vector2(1f, 1f);
            rt.pivot = new Vector2(0.5f, 1f);
            rt.anchoredPosition = new Vector2(0f, -15f);
            rt.sizeDelta = new Vector2(-40f, 75f);
        }

        // 3. Stats bar — medium grey, below title
        if (statsText != null)
        {
            statsText.font = monoFont;
            statsText.fontSize = 16;
            statsText.color = new Color(0.65f, 0.68f, 0.73f);
            statsText.alignment = TextAnchor.UpperLeft;

            RectTransform rt = statsText.rectTransform;
            rt.anchorMin = new Vector2(0f, 1f);
            rt.anchorMax = new Vector2(1f, 1f);
            rt.pivot = new Vector2(0.5f, 1f);
            rt.anchoredPosition = new Vector2(0f, -95f);
            rt.sizeDelta = new Vector2(-40f, 25f);
        }

        // 4. Style Buttons — bottom anchored
        if (runButton != null)
        {
            Image btnImg = runButton.GetComponent<Image>();
            if (btnImg != null) btnImg.color = new Color(0.18f, 0.49f, 0.27f, 1f);
            Text runLabel = runButton.GetComponentInChildren<Text>();
            if (runLabel != null)
            {
                runLabel.font = monoFont;
                runLabel.fontSize = 18;
                runLabel.fontStyle = FontStyle.Bold;
            }

            RectTransform rt = runButton.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.5f, 0f);
            rt.anchorMax = new Vector2(0.5f, 0f);
            rt.pivot = new Vector2(0.5f, 0f);
            rt.anchoredPosition = new Vector2(-90f, 12f);
            rt.sizeDelta = new Vector2(150f, 40f);
        }

        if (closeButton != null)
        {
            Image btnImg = closeButton.GetComponent<Image>();
            if (btnImg != null) btnImg.color = new Color(0.24f, 0.25f, 0.26f, 1f);
            Text closeLabel = closeButton.GetComponentInChildren<Text>();
            if (closeLabel != null)
            {
                closeLabel.font = monoFont;
                closeLabel.fontSize = 18;
            }

            RectTransform rt = closeButton.GetComponent<RectTransform>();
            rt.anchorMin = new Vector2(0.5f, 0f);
            rt.anchorMax = new Vector2(0.5f, 0f);
            rt.pivot = new Vector2(0.5f, 0f);
            rt.anchoredPosition = new Vector2(90f, 12f);
            rt.sizeDelta = new Vector2(150f, 40f);
        }

        // 5. Result / Console panel at bottom (above buttons)
        if (resultText != null)
        {
            resultText.font = monoFont;
            resultText.fontSize = 15;
            resultText.alignment = TextAnchor.UpperLeft;
            resultText.supportRichText = true;
            resultText.horizontalOverflow = HorizontalWrapMode.Wrap;
            resultText.verticalOverflow = VerticalWrapMode.Truncate;

            RectTransform rt = resultText.rectTransform;
            rt.anchorMin = new Vector2(0f, 0f);
            rt.anchorMax = new Vector2(1f, 0f);
            rt.pivot = new Vector2(0.5f, 0f);
            rt.anchoredPosition = new Vector2(0f, 58f);
            rt.sizeDelta = new Vector2(-40f, 70f);

            // Add background image behind resultText to make it look like a distinct terminal output window
            Transform bgTransform = resultText.transform.parent != null ? resultText.transform.parent.Find("ConsoleBackground") : null;
            Image consoleBg = bgTransform != null ? bgTransform.GetComponent<Image>() : null;
            if (consoleBg == null && resultText.transform.parent != null)
            {
                GameObject bgObj = new GameObject("ConsoleBackground", typeof(RectTransform), typeof(Image));
                bgObj.transform.SetParent(resultText.transform.parent, false);
                bgObj.transform.SetSiblingIndex(resultText.transform.GetSiblingIndex());
                consoleBg = bgObj.GetComponent<Image>();
            }

            if (consoleBg != null)
            {
                RectTransform bgRt = consoleBg.rectTransform;
                bgRt.anchorMin = rt.anchorMin;
                bgRt.anchorMax = rt.anchorMax;
                bgRt.pivot = rt.pivot;
                bgRt.anchoredPosition = rt.anchoredPosition;
                bgRt.sizeDelta = rt.sizeDelta;
                consoleBg.color = new Color(0.08f, 0.08f, 0.09f, 0.95f);
            }
        }

        // 6. Code Editor Field & Line Numbers Gutter — fill middle area
        if (codeEditor != null)
        {
            // Add RectMask2D so code lines never overflow/bleed into the console text below
            RectMask2D mask = codeEditor.gameObject.GetComponent<RectMask2D>();
            if (mask == null) mask = codeEditor.gameObject.AddComponent<RectMask2D>();

            RectTransform editorRt = codeEditor.GetComponent<RectTransform>();
            editorRt.anchorMin = new Vector2(0f, 0f);
            editorRt.anchorMax = new Vector2(1f, 1f);
            editorRt.pivot = new Vector2(0.5f, 0.5f);
            editorRt.offsetMin = new Vector2(20f, 142f); // 142px from bottom (above 58+70=128 console panel)
            editorRt.offsetMax = new Vector2(-20f, -125f);

            // Editor background
            Image editorBg = codeEditor.GetComponent<Image>();
            if (editorBg != null) editorBg.color = new Color(0.118f, 0.122f, 0.133f, 1f);

            // Configure visible IDE caret cursor and selection
            codeEditor.customCaretColor = true;
            codeEditor.caretColor = new Color(0.95f, 0.95f, 0.95f, 1f); // Bright white PyCharm cursor
            codeEditor.caretWidth = 2; // 2px IDE width
            codeEditor.caretBlinkRate = 0.85f;
            codeEditor.selectionColor = new Color(0.21f, 0.31f, 0.45f, 0.6f);

            // The invisible input text (typing happens here)
            Text inputText = codeEditor.textComponent as Text;
            if (inputText != null)
            {
                inputText.font = monoFont;
                inputText.fontSize = 18;
                inputText.lineSpacing = 1.2f;
                inputText.color = new Color(1f, 1f, 1f, 0f); // invisible — overlay shows colored version
            }

            // Wire up the PythonHighlighter
            PythonHighlighter highlighter = codeEditor.GetComponent<PythonHighlighter>();
            if (highlighter == null) highlighter = codeEditor.gameObject.AddComponent<PythonHighlighter>();
            highlighter.inputField = codeEditor;

            // Syntax-highlighted overlay text — must match inputText exactly
            Transform overlayTr = codeEditor.transform.Find("HighlightOverlay");
            Text overlayText = overlayTr != null ? overlayTr.GetComponent<Text>() : null;
            if (overlayText != null)
            {
                overlayText.font = monoFont;
                overlayText.fontSize = 18;
                overlayText.lineSpacing = 1.2f;
                overlayText.color = new Color(0.66f, 0.72f, 0.78f); // #A9B7C6
                overlayText.raycastTarget = false;
                highlighter.overlayText = overlayText;
            }

            // Line Numbers Gutter — create if missing, style if existing
            Transform gutterTr = codeEditor.transform.Find("LineNumbersGutter");
            Text lineNumsText = null;
            if (gutterTr == null)
            {
                // --- Create Gutter container ---
                GameObject gutterObj = new GameObject("LineNumbersGutter", typeof(RectTransform), typeof(Image));
                gutterObj.transform.SetParent(codeEditor.transform, false);
                gutterObj.GetComponent<Image>().color = new Color(0.098f, 0.098f, 0.106f, 1f);

                RectTransform gutterRect = gutterObj.GetComponent<RectTransform>();
                gutterRect.anchorMin = new Vector2(0f, 0f);
                gutterRect.anchorMax = new Vector2(0f, 1f);
                gutterRect.pivot = new Vector2(0f, 0.5f);
                gutterRect.anchoredPosition = Vector2.zero;
                gutterRect.sizeDelta = new Vector2(50f, 0f);

                // Vertical separator line
                GameObject sepObj = new GameObject("GutterSeparator", typeof(RectTransform), typeof(Image));
                sepObj.transform.SetParent(gutterObj.transform, false);
                sepObj.GetComponent<Image>().color = new Color(0.22f, 0.23f, 0.25f, 1f);
                RectTransform sepRect = sepObj.GetComponent<RectTransform>();
                sepRect.anchorMin = new Vector2(1f, 0f);
                sepRect.anchorMax = new Vector2(1f, 1f);
                sepRect.pivot = new Vector2(1f, 0.5f);
                sepRect.sizeDelta = new Vector2(1f, 0f);

                // Line numbers text
                GameObject textObj = new GameObject("LineNumbersText", typeof(RectTransform), typeof(Text));
                textObj.transform.SetParent(gutterObj.transform, false);
                lineNumsText = textObj.GetComponent<Text>();
                lineNumsText.font = monoFont;
                lineNumsText.fontSize = 18;
                lineNumsText.lineSpacing = 1.2f;
                lineNumsText.color = new Color(0.42f, 0.43f, 0.46f); // #6B6E75
                lineNumsText.alignment = TextAnchor.UpperRight;
                lineNumsText.horizontalOverflow = HorizontalWrapMode.Overflow;
                lineNumsText.verticalOverflow = VerticalWrapMode.Overflow;
                lineNumsText.raycastTarget = false;

                RectTransform textRect = textObj.GetComponent<RectTransform>();
                textRect.anchorMin = Vector2.zero;
                textRect.anchorMax = Vector2.one;
                textRect.offsetMin = new Vector2(4f, 6f);
                textRect.offsetMax = new Vector2(-8f, -6f);

                // Push InputField text and overlay right of the gutter
                float leftPad = 58f;
                if (codeEditor.textComponent != null)
                {
                    RectTransform inputRect = codeEditor.textComponent.GetComponent<RectTransform>();
                    inputRect.offsetMin = new Vector2(leftPad, 6f);
                    inputRect.offsetMax = new Vector2(-10f, -6f);
                }
                if (overlayText != null)
                {
                    RectTransform overlayRect = overlayText.GetComponent<RectTransform>();
                    overlayRect.offsetMin = new Vector2(leftPad, 6f);
                    overlayRect.offsetMax = new Vector2(-10f, -6f);
                }
            }
            else
            {
                // Gutter already exists — just grab the text reference
                Transform textTr = gutterTr.Find("LineNumbersText");
                if (textTr != null)
                {
                    lineNumsText = textTr.GetComponent<Text>();
                    if (lineNumsText != null)
                    {
                        lineNumsText.font = monoFont;
                        lineNumsText.fontSize = 18;
                        lineNumsText.lineSpacing = 1.2f;
                    }
                }
            }

            if (lineNumsText != null)
            {
                highlighter.lineNumbersText = lineNumsText;
            }
        }
    }

    private float currentScrollY = 0f;

    private void Update()
    {
        if (codeEditor != null && panelRoot != null && panelRoot.activeInHierarchy)
        {
            float scroll = Input.GetAxis("Mouse ScrollWheel");
            if (Mathf.Abs(scroll) > 0.001f)
            {
                currentScrollY = Mathf.Max(0f, currentScrollY - scroll * 120f);
                ApplyEditorScroll();
            }

            PythonHighlighter highlighter = codeEditor.GetComponent<PythonHighlighter>();
            if (highlighter != null && !string.IsNullOrEmpty(highlighter.currentErrorHint))
            {
                if (resultText != null && (string.IsNullOrEmpty(resultText.text) || resultText.text.StartsWith("<color=#7A7E85>") || resultText.text.StartsWith("<color=#FF5252>")))
                {
                    resultText.text = $"<color=#FF5252>● {highlighter.currentErrorHint}</color>";
                }
            }
        }
    }

    private void ApplyEditorScroll()
    {
        if (codeEditor == null || codeEditor.textComponent == null) return;

        RectTransform inputRect = codeEditor.textComponent.GetComponent<RectTransform>();
        if (inputRect != null)
        {
            inputRect.anchoredPosition = new Vector2(inputRect.anchoredPosition.x, currentScrollY);
        }

        Transform overlayTr = codeEditor.transform.Find("HighlightOverlay");
        if (overlayTr != null)
        {
            RectTransform overlayRect = overlayTr.GetComponent<RectTransform>();
            if (overlayRect != null)
            {
                overlayRect.anchoredPosition = new Vector2(overlayRect.anchoredPosition.x, currentScrollY);
            }
        }

        Transform gutterTr = codeEditor.transform.Find("LineNumbersGutter/LineNumbersText");
        if (gutterTr != null)
        {
            RectTransform gutterRect = gutterTr.GetComponent<RectTransform>();
            if (gutterRect != null)
            {
                gutterRect.anchoredPosition = new Vector2(gutterRect.anchoredPosition.x, currentScrollY);
            }
        }
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
                    missionInfoText.text = $"<color=#F55A5A>Failed to load mission: {request.error}</color>";
                }
                yield break;
            }

            _mission = JsonUtility.FromJson<MissionConfig>(request.downloadHandler.text);
        }

        if (missionInfoText != null)
        {
            missionInfoText.text = $"<b>{_mission.title}</b>\n<color=#A9B7C6>{_mission.description}</color>";
        }

        if (codeEditor != null)
        {
            codeEditor.text = BuildStarterTemplate(_mission);
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
        if (resultText != null) resultText.text = "<color=#FFC66D>▶ Running script on backend...</color>";

        CodeExecuteRequestBody body = new CodeExecuteRequestBody
        {
            mission_id = _mission.mission_id,
            level_id = _mission.level.ToString(),
            dataset = _mission.dataset,
            problem_type = _mission.problem_type,
            code = codeEditor != null ? codeEditor.text : "",
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
                if (resultText != null) resultText.text = $"<color=#F55A5A><b>✖ CONNECTION ERROR</b></color>\n<color=#F55A5A>{request.error}</color>";
                Debug.LogError($"[BlackVault] /train/code FAILED: {request.error}\n{request.downloadHandler.text}");
                yield break;
            }

            CodeExecuteResponseBody response = JsonUtility.FromJson<CodeExecuteResponseBody>(request.downloadHandler.text);
            bool unlocked = response.door_status == "UNLOCKED";

            if (resultText != null)
            {
                if (!string.IsNullOrEmpty(response.error))
                {
                    resultText.text = $"<color=#F55A5A><b>✖ EXECUTION ERROR</b></color>\n<color=#F55A5A>{response.error}</color>";
                }
                else
                {
                    resultText.text = unlocked
                        ? $"<color=#499C54><b>✔ ACCESS GRANTED — PUZZLE SOLVED</b></color>\n<color=#A9B7C6>{response.target_metric}: {response.achieved:F3} (target: {response.target_value:F3})</color>"
                        : $"<color=#F55A5A><b>✖ ACCESS DENIED — METRIC NOT MET</b></color>\n<color=#A9B7C6>{response.target_metric}: {response.achieved:F3} (target: {response.target_value:F3})</color>";
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