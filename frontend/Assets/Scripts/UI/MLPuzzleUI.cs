// MLPuzzleUI.cs — BlackVault v2
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
    public Text missionInfoText;
    public Text statsText;
    public InputField codeEditor;
    public Text resultText;
    public Button runButton;
    public Button closeButton;

    [Header("Player Reference")]
    public PlayerController player;

    [Serializable] private class MissionConfig { public string mission_id; public int level; public string title; public string description; public string problem_type; public string dataset; public string target_col; public string[] feature_cols; public string[] algorithms_allowed; public string target_metric; public float target_metric_value; public string metric_direction; public int[] k_range; public string difficulty; public int time_limit_seconds; public int max_retries; public bool hints_available; }
    [Serializable] private class PreprocessRequestBody { public string dataset; public string missing_strategy = "fill_median"; public bool remove_duplicates = false; public string outlier_strategy = "none"; public string encoding = "none"; public string scaling = "none"; }
    [Serializable] private class PreprocessResponseBody { public string dataset; public int rows_before; public int rows_after; public int missing_before; public int missing_after; public int duplicates_removed; }
    [Serializable] private class CodeExecuteRequestBody { public string mission_id; public string level_id; public string dataset; public string problem_type; public string code; public string target_col; public string[] feature_cols; public string target_metric = "accuracy"; public float target_metric_value = 0.75f; public string metric_direction = "higher_is_better"; }
    [Serializable] private class CodeExecuteResponseBody { public string target_metric; public float target_value; public float achieved; public bool passed; public string door_status; public string error; }

    private MissionConfig _mission;
    private Action<bool> _onResultCallback;
    private float _scrollYCurrent = 0f;
    private float _scrollYTarget = 0f;
    private const float ScrollSpeed = 130f;
    private const float ScrollLerp = 12f;
    private Text _statusBarText;

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
        _scrollYCurrent = 0f; _scrollYTarget = 0f;
        ApplyEditorScroll(0f);
        if (resultText != null) resultText.text = "<color=#7A7E85>Console ready. Click Run to execute your script.</color>";
        if (statsText != null) statsText.text = "";
        if (missionInfoText != null) missionInfoText.text = "Loading mission...";
        if (codeEditor != null) codeEditor.text = "";
        StartCoroutine(FetchMissionThenPreview(level));
    }

    private void EnsurePyCharmStyle()
    {
        if (panelRoot == null) return;
        CanvasScaler scaler = panelRoot.GetComponentInParent<CanvasScaler>();
        if (scaler != null) { scaler.uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize; scaler.scaleFactor = 1f; }

        Font monoFont = Font.CreateDynamicFontFromOSFont("Consolas", 20)
                     ?? Font.CreateDynamicFontFromOSFont("Courier New", 20)
                     ?? Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");

        Image panelImage = panelRoot.GetComponent<Image>();
        if (panelImage != null) panelImage.color = new Color(0.118f, 0.122f, 0.133f, 0.98f);
        RectTransform panelRect = panelRoot.GetComponent<RectTransform>();
        if (panelRect != null) { panelRect.anchorMin = Vector2.zero; panelRect.anchorMax = Vector2.one; panelRect.offsetMin = new Vector2(30f, 20f); panelRect.offsetMax = new Vector2(-30f, -20f); }

        if (missionInfoText != null) { missionInfoText.font = monoFont; missionInfoText.fontSize = 20; missionInfoText.lineSpacing = 1.1f; missionInfoText.supportRichText = true; missionInfoText.alignment = TextAnchor.UpperLeft; missionInfoText.color = new Color(0.95f, 0.35f, 0.35f); }
        if (statsText != null) { statsText.font = monoFont; statsText.fontSize = 16; statsText.color = new Color(0.65f, 0.68f, 0.73f); statsText.alignment = TextAnchor.UpperLeft; }

        StyleButton(runButton, monoFont, new Color(0.18f, 0.49f, 0.27f, 1f), new Vector2(-90f, 12f));
        StyleButton(closeButton, monoFont, new Color(0.24f, 0.25f, 0.26f, 1f), new Vector2(90f, 12f));

        if (resultText != null)
        {
            resultText.font = monoFont; resultText.fontSize = 15; resultText.alignment = TextAnchor.UpperLeft;
            resultText.supportRichText = true; resultText.horizontalOverflow = HorizontalWrapMode.Wrap; resultText.verticalOverflow = VerticalWrapMode.Truncate;
            RectTransform rt = resultText.rectTransform;
            rt.anchorMin = new Vector2(0f, 0f); rt.anchorMax = new Vector2(1f, 0f); rt.pivot = new Vector2(0.5f, 0f);
            rt.anchoredPosition = new Vector2(0f, 76f); rt.sizeDelta = new Vector2(-40f, 60f);
            EnsureConsoleBackground(resultText);
        }

        if (codeEditor != null)
        {
            if (codeEditor.gameObject.GetComponent<RectMask2D>() == null) codeEditor.gameObject.AddComponent<RectMask2D>();
            RectTransform editorRt = codeEditor.GetComponent<RectTransform>();
            editorRt.anchorMin = new Vector2(0f, 0f); editorRt.anchorMax = new Vector2(1f, 1f); editorRt.pivot = new Vector2(0.5f, 0.5f);
            editorRt.offsetMin = new Vector2(20f, 162f); editorRt.offsetMax = new Vector2(-20f, -125f);
            Image editorBg = codeEditor.GetComponent<Image>();
            if (editorBg != null) editorBg.color = new Color(0.118f, 0.122f, 0.133f, 1f);

            // Smooth IDE caret -- 0.53s = standard real IDE blink rate
            codeEditor.customCaretColor = true;
            codeEditor.caretColor = new Color(0.95f, 0.95f, 0.95f, 1f);
            codeEditor.caretWidth = 2;
            codeEditor.caretBlinkRate = 0.53f;
            codeEditor.selectionColor = new Color(0.21f, 0.31f, 0.45f, 0.6f);

            Text inputText = codeEditor.textComponent as Text;
            if (inputText != null) { inputText.font = monoFont; inputText.fontSize = 18; inputText.lineSpacing = 1.2f; inputText.color = new Color(1f,1f,1f,0f); inputText.supportRichText = false; inputText.alignment = TextAnchor.UpperLeft; inputText.horizontalOverflow = HorizontalWrapMode.Wrap; inputText.verticalOverflow = VerticalWrapMode.Truncate; }
            if (codeEditor.placeholder != null) codeEditor.placeholder.gameObject.SetActive(string.IsNullOrEmpty(codeEditor.text));

            PythonHighlighter highlighter = codeEditor.GetComponent<PythonHighlighter>() ?? codeEditor.gameObject.AddComponent<PythonHighlighter>();
            highlighter.inputField = codeEditor;

            Transform overlayTr = codeEditor.transform.Find("HighlightOverlay");
            Text overlayText = overlayTr != null ? overlayTr.GetComponent<Text>() : null;
            if (overlayText != null) { overlayText.font = monoFont; overlayText.fontSize = 18; overlayText.lineSpacing = 1.2f; overlayText.color = new Color(0.66f,0.72f,0.78f); overlayText.supportRichText = true; overlayText.alignment = TextAnchor.UpperLeft; overlayText.horizontalOverflow = HorizontalWrapMode.Wrap; overlayText.verticalOverflow = VerticalWrapMode.Truncate; overlayText.raycastTarget = false; highlighter.overlayText = overlayText; }

            EnsureLineNumbersGutter(monoFont, out Text lineNumsText);
            highlighter.lineNumbersText = lineNumsText;

            const float leftPad = 58f;
            if (codeEditor.textComponent != null) { var r = codeEditor.textComponent.GetComponent<RectTransform>(); r.offsetMin = new Vector2(leftPad,6f); r.offsetMax = new Vector2(-10f,-6f); }
            if (overlayText != null) { var r = overlayText.GetComponent<RectTransform>(); r.offsetMin = new Vector2(leftPad,6f); r.offsetMax = new Vector2(-10f,-6f); }
        }

        EnsureStatusBar(monoFont);
        UpdateTopLayout();
    }

    private void StyleButton(Button btn, Font f, Color bg, Vector2 pos)
    {
        if (btn == null) return;
        var img = btn.GetComponent<Image>(); if (img != null) img.color = bg;
        var lbl = btn.GetComponentInChildren<Text>(); if (lbl != null) { lbl.font = f; lbl.fontSize = 18; lbl.fontStyle = FontStyle.Bold; }
        var rt = btn.GetComponent<RectTransform>(); rt.anchorMin = rt.anchorMax = new Vector2(0.5f,0f); rt.pivot = new Vector2(0.5f,0f); rt.anchoredPosition = pos; rt.sizeDelta = new Vector2(150f,40f);
    }

    private void EnsureConsoleBackground(Text src)
    {
        var parent = src.transform.parent; if (parent == null) return;
        var bgTr = parent.Find("ConsoleBackground");
        Image bg = bgTr != null ? bgTr.GetComponent<Image>() : null;
        if (bg == null) { var o = new GameObject("ConsoleBackground", typeof(RectTransform), typeof(Image)); o.transform.SetParent(parent,false); o.transform.SetSiblingIndex(src.transform.GetSiblingIndex()); bg = o.GetComponent<Image>(); }
        var bgR = bg.rectTransform; var sR = src.rectTransform;
        bgR.anchorMin = sR.anchorMin; bgR.anchorMax = sR.anchorMax; bgR.pivot = sR.pivot; bgR.anchoredPosition = sR.anchoredPosition; bgR.sizeDelta = sR.sizeDelta;
        bg.color = new Color(0.08f,0.08f,0.09f,0.95f);
    }

    private void EnsureLineNumbersGutter(Font f, out Text lineNumsText)
    {
        lineNumsText = null;
        Transform gutterTr = codeEditor.transform.Find("LineNumbersGutter");
        if (gutterTr == null)
        {
            var g = new GameObject("LineNumbersGutter", typeof(RectTransform), typeof(Image)); g.transform.SetParent(codeEditor.transform, false);
            g.GetComponent<Image>().color = new Color(0.098f,0.098f,0.106f,1f);
            var gr = g.GetComponent<RectTransform>(); gr.anchorMin=new Vector2(0f,0f); gr.anchorMax=new Vector2(0f,1f); gr.pivot=new Vector2(0f,0.5f); gr.anchoredPosition=Vector2.zero; gr.sizeDelta=new Vector2(50f,0f);
            var sep = new GameObject("GutterSeparator",typeof(RectTransform),typeof(Image)); sep.transform.SetParent(g.transform,false); sep.GetComponent<Image>().color=new Color(0.22f,0.23f,0.25f,1f);
            var sr=sep.GetComponent<RectTransform>(); sr.anchorMin=new Vector2(1f,0f); sr.anchorMax=new Vector2(1f,1f); sr.pivot=new Vector2(1f,0.5f); sr.sizeDelta=new Vector2(1f,0f);
            var to=new GameObject("LineNumbersText",typeof(RectTransform),typeof(Text)); to.transform.SetParent(g.transform,false);
            lineNumsText=to.GetComponent<Text>(); lineNumsText.font=f; lineNumsText.fontSize=18; lineNumsText.lineSpacing=1.2f; lineNumsText.color=new Color(0.42f,0.43f,0.46f); lineNumsText.alignment=TextAnchor.UpperRight; lineNumsText.horizontalOverflow=HorizontalWrapMode.Overflow; lineNumsText.verticalOverflow=VerticalWrapMode.Overflow; lineNumsText.raycastTarget=false;
            var tr=to.GetComponent<RectTransform>(); tr.anchorMin=Vector2.zero; tr.anchorMax=Vector2.one; tr.offsetMin=new Vector2(4f,6f); tr.offsetMax=new Vector2(-8f,-6f);
        }
        else { var t=gutterTr.Find("LineNumbersText"); if(t!=null){lineNumsText=t.GetComponent<Text>(); if(lineNumsText!=null){lineNumsText.font=f;lineNumsText.fontSize=18;lineNumsText.lineSpacing=1.2f;}} }
    }

    private void EnsureStatusBar(Font f)
    {
        if (panelRoot == null) return;
        Transform parent = codeEditor != null ? codeEditor.transform.parent : panelRoot.transform;
        Transform sbTr = parent.Find("StatusBar");
        if (sbTr == null)
        {
            var sb = new GameObject("StatusBar",typeof(RectTransform),typeof(Image)); sb.transform.SetParent(parent,false);
            sb.GetComponent<Image>().color = new Color(0.078f,0.082f,0.094f,1f);
            var r=sb.GetComponent<RectTransform>(); r.anchorMin=new Vector2(0f,0f); r.anchorMax=new Vector2(1f,0f); r.pivot=new Vector2(0.5f,0f); r.anchoredPosition=new Vector2(20f,138f); r.sizeDelta=new Vector2(-40f,20f);
            var to=new GameObject("StatusBarText",typeof(RectTransform),typeof(Text)); to.transform.SetParent(sb.transform,false);
            _statusBarText=to.GetComponent<Text>(); _statusBarText.font=f; _statusBarText.fontSize=13; _statusBarText.color=new Color(0.55f,0.58f,0.63f); _statusBarText.alignment=TextAnchor.MiddleRight; _statusBarText.horizontalOverflow=HorizontalWrapMode.Overflow; _statusBarText.raycastTarget=false;
            var tr=to.GetComponent<RectTransform>(); tr.anchorMin=Vector2.zero; tr.anchorMax=Vector2.one; tr.offsetMin=new Vector2(8f,0f); tr.offsetMax=new Vector2(-8f,0f);
        }
        else { _statusBarText=sbTr.Find("StatusBarText")?.GetComponent<Text>(); }
        if (_statusBarText!=null) _statusBarText.text="Ln 1  Col 1";
    }

    public void UpdateTopLayout()
    {
        if (missionInfoText == null) return;
        Canvas.ForceUpdateCanvases();
        RectTransform infoRt = missionInfoText.rectTransform;
        infoRt.anchorMin=new Vector2(0f,1f); infoRt.anchorMax=new Vector2(1f,1f); infoRt.pivot=new Vector2(0.5f,1f); infoRt.anchoredPosition=new Vector2(0f,-15f);
        float infoHeight = Mathf.Max(50f, missionInfoText.preferredHeight); infoRt.sizeDelta = new Vector2(-40f, infoHeight);
        float statsTop = 15f + infoHeight + 8f;
        if (statsText != null) { var r=statsText.rectTransform; r.anchorMin=new Vector2(0f,1f); r.anchorMax=new Vector2(1f,1f); r.pivot=new Vector2(0.5f,1f); r.anchoredPosition=new Vector2(0f,-statsTop); r.sizeDelta=new Vector2(-40f,25f); }
        float editorTop = statsTop + (statsText != null ? 28f : 0f) + 8f;
        if (codeEditor != null) { var r=codeEditor.GetComponent<RectTransform>(); r.anchorMin=new Vector2(0f,0f); r.anchorMax=new Vector2(1f,1f); r.pivot=new Vector2(0.5f,0.5f); r.offsetMin=new Vector2(20f,162f); r.offsetMax=new Vector2(-20f,-editorTop); }
    }

    private void Update()
    {
        if (codeEditor == null || panelRoot == null || !panelRoot.activeInHierarchy) return;
        float scroll = Input.GetAxis("Mouse ScrollWheel");
        if (Mathf.Abs(scroll) > 0.001f) _scrollYTarget = Mathf.Max(0f, _scrollYTarget - scroll * ScrollSpeed);
        if (Mathf.Abs(_scrollYTarget - _scrollYCurrent) > 0.1f) { _scrollYCurrent = Mathf.Lerp(_scrollYCurrent, _scrollYTarget, Time.deltaTime * ScrollLerp); ApplyEditorScroll(_scrollYCurrent); }
        UpdateStatusBar();
        PythonHighlighter h = codeEditor.GetComponent<PythonHighlighter>();
        if (h != null && !string.IsNullOrEmpty(h.currentErrorHint))
            if (resultText != null && (string.IsNullOrEmpty(resultText.text) || resultText.text.StartsWith("<color=#7A7E85>") || resultText.text.StartsWith("<color=#FF5252>")))
                resultText.text = $"<color=#FF5252>\u25cf {h.currentErrorHint}</color>";
    }

    private void UpdateStatusBar()
    {
        if (_statusBarText == null || codeEditor == null) return;
        string text = codeEditor.text ?? ""; int caret = Mathf.Clamp(codeEditor.caretPosition, 0, text.Length);
        int line = 1, col = 1;
        for (int i = 0; i < caret; i++) { if (text[i] == '\n') { line++; col = 1; } else col++; }
        _statusBarText.text = $"Ln {line}  Col {col}";
    }

    private void ApplyEditorScroll(float scrollY)
    {
        if (codeEditor == null || codeEditor.textComponent == null) return;
        var ir = codeEditor.textComponent.GetComponent<RectTransform>(); if (ir != null) ir.anchoredPosition = new Vector2(ir.anchoredPosition.x, scrollY);
        var ot = codeEditor.transform.Find("HighlightOverlay"); if (ot != null) { var r = ot.GetComponent<RectTransform>(); if(r!=null) r.anchoredPosition=new Vector2(r.anchoredPosition.x,scrollY); }
        var gt = codeEditor.transform.Find("LineNumbersGutter/LineNumbersText"); if (gt != null) { var r = gt.GetComponent<RectTransform>(); if(r!=null) r.anchoredPosition=new Vector2(r.anchoredPosition.x,scrollY); }
    }

    public void Close() { if (panelRoot != null) panelRoot.SetActive(false); if (player != null) player.SetInputEnabled(true); }

    private IEnumerator FetchMissionThenPreview(int level)
    {
        using (var req = UnityWebRequest.Get($"{BaseUrl}/mission/generate?level={level}"))
        {
            yield return req.SendWebRequest();
            if (req.result != UnityWebRequest.Result.Success) { if (missionInfoText!=null) missionInfoText.text=$"<color=#F55A5A>Failed to load mission: {req.error}</color>"; yield break; }
            _mission = JsonUtility.FromJson<MissionConfig>(req.downloadHandler.text);
        }
        if (missionInfoText != null) missionInfoText.text = $"<b>{_mission.title}</b>\n<color=#A9B7C6>{_mission.description}</color>";
        UpdateTopLayout();
        if (codeEditor != null)
        {
            codeEditor.text = BuildStarterTemplate(_mission);
            var h = codeEditor.GetComponent<PythonHighlighter>(); if (h!=null) h.SetTaskContext(_mission.problem_type, _mission.target_col, _mission.feature_cols);
        }
        yield return FetchPreview();
    }

    private string BuildStarterTemplate(MissionConfig m)
    {
        var sb = new StringBuilder();
        sb.AppendLine("# ================================================================");
        sb.AppendLine("# BlackVault Code Terminal");
        sb.AppendLine("# ================================================================");
        sb.AppendLine("#");
        sb.AppendLine("# PRE-LOADED VARIABLES (already available, do NOT redefine):");
        sb.AppendLine("#   df           -> pandas DataFrame of the raw dataset");
        sb.AppendLine("#   target_col   -> name of the label/target column (string)");
        sb.AppendLine("#   feature_cols -> list of input column names");
        sb.AppendLine("#   pd, np       -> pandas, numpy");
        sb.AppendLine("#   train_test_split, StandardScaler, LabelEncoder");
        sb.AppendLine("#   LogisticRegression, RandomForestClassifier, LinearRegression");
        sb.AppendLine("#   KMeans, IsolationForest");
        sb.AppendLine("#");
        sb.AppendLine($"# DATASET  : {m.dataset}");
        if (!string.IsNullOrEmpty(m.target_col)) sb.AppendLine($"# TARGET   : {m.target_col}");
        if (m.feature_cols != null && m.feature_cols.Length > 0) sb.AppendLine($"# FEATURES : {string.Join(", ", m.feature_cols)}");
        sb.AppendLine("# ================================================================");
        sb.AppendLine();

        switch (m.problem_type)
        {
            case "cleaning": case "data_cleaning":
                sb.AppendLine("# GOAL: Remove missing values and duplicate rows from df.");
                sb.AppendLine("# REQUIRED OUTPUT: is_clean = 1   OR   clean_df = <cleaned DataFrame>");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 1: Drop rows with missing values ---------------");
                sb.AppendLine("# Use: df.dropna()  -> removes any row that has a NaN");
                sb.AppendLine("df = df.dropna()");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 2: Remove duplicate rows -----------------------");
                sb.AppendLine("# Use: df.drop_duplicates()  -> removes exact duplicate rows");
                sb.AppendLine("df = df.drop_duplicates()");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 3: Signal success (REQUIRED) -------------------");
                sb.AppendLine("is_clean = 1");
                break;

            case "regression":
                sb.AppendLine("# GOAL: Predict a numeric value.  REQUIRED: y_test, y_pred");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 1: Prepare features & target -------------------");
                sb.AppendLine("X = df[feature_cols]");
                sb.AppendLine("y = df[target_col]");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 2: Split train / test --------------------------");
                sb.AppendLine("# Use: train_test_split(X, y, test_size=0.2)");
                sb.AppendLine("X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 3: Train model --------------------------------");
                sb.AppendLine("# Options: LinearRegression()  |  RandomForestRegressor()");
                sb.AppendLine("from sklearn.linear_model import LinearRegression");
                sb.AppendLine("model = LinearRegression()  # <- swap if needed");
                sb.AppendLine("model.fit(X_train, y_train)");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 4: Predict (REQUIRED output) ------------------");
                sb.AppendLine("y_pred = model.predict(X_test)");
                break;

            case "classification":
                sb.AppendLine("# GOAL: Classify each row.  REQUIRED: y_test, y_pred");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 1: Prepare features & target -------------------");
                sb.AppendLine("X = df[feature_cols]");
                sb.AppendLine("y = df[target_col]");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 2: Split train / test --------------------------");
                sb.AppendLine("X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 3: Train classifier ----------------------------");
                sb.AppendLine("# Options: LogisticRegression()  |  RandomForestClassifier()");
                sb.AppendLine("model = LogisticRegression(max_iter=200)  # <- swap if needed");
                sb.AppendLine("model.fit(X_train, y_train)");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 4: Predict (REQUIRED output) ------------------");
                sb.AppendLine("y_pred = model.predict(X_test)");
                break;

            case "clustering":
                sb.AppendLine("# GOAL: Group rows into clusters.  REQUIRED: labels");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 1: Select features -----------------------------");
                sb.AppendLine("X = df[feature_cols] if feature_cols else df.select_dtypes(include='number')");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 2: Scale (KMeans is scale-sensitive) -----------");
                sb.AppendLine("# Use: StandardScaler().fit_transform(X)");
                sb.AppendLine("X_scaled = StandardScaler().fit_transform(X)");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 3: Cluster (adjust n_clusters as needed) -------");
                sb.AppendLine("model = KMeans(n_clusters=3, random_state=42)");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 4: Assign labels (REQUIRED output) ------------");
                sb.AppendLine("labels = model.fit_predict(X_scaled)");
                break;

            case "anomaly_detection":
                sb.AppendLine("# GOAL: Flag anomalous rows.  REQUIRED: anomaly_flags (0=normal, 1=anomaly)");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 1: Select numeric features ---------------------");
                sb.AppendLine("X = df[feature_cols] if feature_cols else df.select_dtypes(include='number')");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 2: Fit IsolationForest -------------------------");
                sb.AppendLine("# contamination -> expected fraction of anomalies (e.g. 0.05 = 5%)");
                sb.AppendLine("model = IsolationForest(contamination=0.05, random_state=42)");
                sb.AppendLine("preds = model.fit_predict(X)  # -1=anomaly, +1=normal");
                sb.AppendLine();
                sb.AppendLine("# -- STEP 3: Convert to 0/1 (REQUIRED output) ----------");
                sb.AppendLine("# Backend expects 0/1; IsolationForest returns -1/+1");
                sb.AppendLine("anomaly_flags = (preds == -1).astype(int)");
                break;

            default:
                sb.AppendLine("# Write your Python solution below.");
                sb.AppendLine("# Make sure to set the required output variable before the end.");
                sb.AppendLine();
                break;
        }
        return sb.ToString();
    }

    private IEnumerator FetchPreview()
    {
        yield return SendPreprocess(new PreprocessRequestBody { dataset = _mission.dataset }, r => {
            if (statsText != null) statsText.text = $"Rows: {r.rows_before}  |  Missing: {r.missing_before}  |  Dataset: {_mission.dataset}";
            UpdateTopLayout();
        });
    }

    private void OnRunClicked() => StartCoroutine(RunCodeSequence());

    private IEnumerator RunCodeSequence()
    {
        if (resultText != null) resultText.text = "<color=#FFC66D>\u25b6 Running script on backend...</color>";
        bool isCleaning = _mission.problem_type == "cleaning" || _mission.problem_type == "data_cleaning" || _mission.level == 1;
        string defaultMetric = isCleaning ? "is_clean" : (_mission.problem_type == "regression" ? "rmse" : "accuracy");
        float defaultTarget = isCleaning ? 1.0f : (_mission.problem_type == "regression" ? 30000.0f : 0.75f);
        var body = new CodeExecuteRequestBody { mission_id=_mission.mission_id, level_id=_mission.level.ToString(), dataset=_mission.dataset, problem_type=_mission.problem_type, code=codeEditor!=null?codeEditor.text:"", target_col=_mission.target_col, feature_cols=_mission.feature_cols, target_metric=string.IsNullOrEmpty(_mission.target_metric)?defaultMetric:_mission.target_metric, target_metric_value=_mission.target_metric_value>0?_mission.target_metric_value:defaultTarget, metric_direction=string.IsNullOrEmpty(_mission.metric_direction)?"higher_is_better":_mission.metric_direction };
        byte[] bodyRaw = Encoding.UTF8.GetBytes(JsonUtility.ToJson(body));
        using (var req = new UnityWebRequest($"{BaseUrl}/train/code","POST"))
        {
            req.uploadHandler=new UploadHandlerRaw(bodyRaw); req.downloadHandler=new DownloadHandlerBuffer(); req.SetRequestHeader("Content-Type","application/json");
            yield return req.SendWebRequest();
            if (req.result != UnityWebRequest.Result.Success) { if(resultText!=null)resultText.text=$"<color=#F55A5A><b>\u2716 CONNECTION ERROR</b></color>\n<color=#F55A5A>{req.error}</color>"; Debug.LogError($"[BlackVault] /train/code FAILED: {req.error}"); yield break; }
            var resp = JsonUtility.FromJson<CodeExecuteResponseBody>(req.downloadHandler.text);
            bool unlocked = resp.door_status == "UNLOCKED";
            if (resultText != null)
            {
                if (!string.IsNullOrEmpty(resp.error)) resultText.text=$"<color=#F55A5A><b>\u2716 EXECUTION ERROR</b></color>\n<color=#F55A5A>{resp.error}</color>";
                else resultText.text = unlocked
                    ? $"<color=#499C54><b>\u2714 ACCESS GRANTED</b></color>\n<color=#A9B7C6>{resp.target_metric}: {resp.achieved:F3} (target: {resp.target_value:F3})</color>"
                    : $"<color=#F55A5A><b>\u2716 ACCESS DENIED</b></color>\n<color=#A9B7C6>{resp.target_metric}: {resp.achieved:F3} (target: {resp.target_value:F3})</color>";
            }
            if (unlocked) { yield return new WaitForSeconds(1.5f); Close(); }
            _onResultCallback?.Invoke(unlocked);
        }
    }

    private IEnumerator SendPreprocess(PreprocessRequestBody body, Action<PreprocessResponseBody> onSuccess)
    {
        byte[] bodyRaw = Encoding.UTF8.GetBytes(JsonUtility.ToJson(body));
        using (var req = new UnityWebRequest($"{BaseUrl}/preprocess","POST"))
        {
            req.uploadHandler=new UploadHandlerRaw(bodyRaw); req.downloadHandler=new DownloadHandlerBuffer(); req.SetRequestHeader("Content-Type","application/json");
            yield return req.SendWebRequest();
            if (req.result != UnityWebRequest.Result.Success) { Debug.LogError($"[BlackVault] /preprocess FAILED: {req.error}"); if(statsText!=null)statsText.text="Failed to load dataset preview."; yield break; }
            onSuccess?.Invoke(JsonUtility.FromJson<PreprocessResponseBody>(req.downloadHandler.text));
        }
    }
}
