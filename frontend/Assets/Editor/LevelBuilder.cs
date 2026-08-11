// LevelBuilder.cs — BlackVault Editor Tool
//
// Auto-builds the Level 1 scene hierarchy described in
// Level1_Scene_Setup_Guide.md: environment, door, terminal, player
// (with dual camera rig), and the ML Puzzle UI canvas — with scripts
// attached and most fields wired automatically.
//
// This MUST go in an "Editor" folder (e.g. Assets/Editor/LevelBuilder.cs)
// so Unity treats it as editor-only tooling, not part of the game build.
//
// Usage:
//   1. Place this file at Assets/Editor/LevelBuilder.cs
//   2. Make sure PlayerController.cs, TerminalInteractable.cs,
//      DoorController.cs, and MLPuzzleUI.cs already exist in your project
//      (Assets/Scripts/...), since this references those types directly.
//   3. In Unity's top menu bar: BlackVault > Build Level 1 Scene
//   4. Save the resulting scene as 01_Level1_DataCleaning.unity
//   5. Open the guide's Test Checklist and verify each item —
//      this script sets up structure, but you should still eyeball
//      positions/scales and adjust to taste.
//
// What this script does NOT do (still manual, on purpose):
//   - Import real art assets (Mixamo/Kenney models) — it uses primitives
//   - Create the "Player" tag if your project doesn't have one yet
//     (Unity doesn't allow creating tags via the public scripting API;
//     add it manually via Edit > Project Settings > Tags and Layers
//     BEFORE running this, or the script will warn and skip tagging)
//   - Fine-tune UI layout/anchoring — it creates the elements, you'll
//     want to adjust RectTransform anchors/sizes for a clean look

using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

public static class LevelBuilder
{
    // Level number -> suggested scene file name. Dataset id is no longer
    // set here — MLPuzzleUI fetches it from GET /mission/generate at
    // runtime, so the builder doesn't need to guess it.
    private static readonly (int level, string sceneName)[] Levels = new[]
    {
        (1, "01_Level1_DataCleaning"),
        (2, "02_Level2_Regression"),
        (3, "03_Level3_Classification"),
        (4, "04_Level4_Clustering"),
        (5, "05_Level5_Anomaly"),
    };

    [MenuItem("BlackVault/Build Level 1 Scene")]
    public static void BuildLevel1() => BuildLevel(1);

    [MenuItem("BlackVault/Build Level 2 Scene")]
    public static void BuildLevel2() => BuildLevel(2);

    [MenuItem("BlackVault/Build Level 3 Scene")]
    public static void BuildLevel3() => BuildLevel(3);

    [MenuItem("BlackVault/Build Level 4 Scene")]
    public static void BuildLevel4() => BuildLevel(4);

    [MenuItem("BlackVault/Build Level 5 Scene")]
    public static void BuildLevel5() => BuildLevel(5);

    /// <summary>
    /// Builds a full level scene for the given level number (1-5).
    /// Call this with the CURRENT SCENE EMPTY — it does not clear an
    /// existing scene for you, to avoid accidentally deleting work.
    /// </summary>
    private static void BuildLevel(int levelNumber)
    {
        var config = System.Array.Find(Levels, l => l.level == levelNumber);
        if (config.level == 0)
        {
            Debug.LogError($"[BlackVault] No config found for level {levelNumber}.");
            return;
        }

        BuildEnvironment(out GameObject door);
        GameObject terminal = BuildTerminal(door, config.level);
        GameObject player = BuildPlayer();
        GameObject canvas = BuildMLPuzzleCanvas(player);

        WireTerminal(terminal, canvas, door);

        Debug.Log($"[BlackVault] Level {levelNumber} scene built. " +
                  $"Save it as {config.sceneName}.unity, then check the " +
                  "Test Checklist in Level1_Scene_Setup_Guide.md.");
    }

    // ------------------------------------------------------------------
    // Environment
    // ------------------------------------------------------------------
    private static void BuildEnvironment(out GameObject door)
    {
        GameObject floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        floor.name = "Floor";
        floor.transform.position = new Vector3(0, -0.05f, 0);
        floor.transform.localScale = new Vector3(10f, 0.1f, 20f);

        CreateWall("Wall_Left", new Vector3(-5f, 1.5f, 0f), new Vector3(0.2f, 3f, 20f));
        CreateWall("Wall_Right", new Vector3(5f, 1.5f, 0f), new Vector3(0.2f, 3f, 20f));
        CreateWall("Wall_Back", new Vector3(0f, 1.5f, -10f), new Vector3(10f, 3f, 0.2f));

        door = BuildDoor();
    }

    private static void CreateWall(string name, Vector3 position, Vector3 scale)
    {
        GameObject wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        wall.name = name;
        wall.transform.position = position;
        wall.transform.localScale = scale;
    }

    private static GameObject BuildDoor()
    {
        GameObject door = new GameObject("Door_01");
        door.transform.position = new Vector3(0f, 1.5f, 10f);

        GameObject doorMesh = GameObject.CreatePrimitive(PrimitiveType.Cube);
        doorMesh.name = "DoorMesh";
        doorMesh.transform.SetParent(door.transform);
        doorMesh.transform.localPosition = Vector3.zero;
        doorMesh.transform.localScale = new Vector3(3f, 3f, 0.3f);

        GameObject blocker = new GameObject("BlockingCollider");
        blocker.transform.SetParent(door.transform);
        blocker.transform.localPosition = Vector3.zero;
        BoxCollider blockerCollider = blocker.AddComponent<BoxCollider>();
        blockerCollider.size = new Vector3(3f, 3f, 0.3f);

        GameObject lightObj = new GameObject("StatusLight");
        lightObj.transform.SetParent(door.transform);
        lightObj.transform.localPosition = new Vector3(0f, 2f, 0f);
        Light statusLight = lightObj.AddComponent<Light>();
        statusLight.type = LightType.Point;
        statusLight.range = 5f;
        statusLight.color = Color.red;

        DoorController controller = door.AddComponent<DoorController>();
        controller.doorMesh = doorMesh.transform;
        controller.blockingCollider = blockerCollider;
        controller.statusLight = statusLight;
        controller.startLocked = true;

        return door;
    }

    // ------------------------------------------------------------------
    // Terminal
    // ------------------------------------------------------------------
    private static GameObject BuildTerminal(GameObject door, int level)
    {
        GameObject terminal = new GameObject("Terminal_01");
        terminal.transform.position = new Vector3(-2f, 0f, 6f);

        GameObject terminalMesh = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
        terminalMesh.name = "TerminalMesh";
        terminalMesh.transform.SetParent(terminal.transform);
        terminalMesh.transform.localPosition = new Vector3(0f, 0.5f, 0f);
        terminalMesh.transform.localScale = new Vector3(0.5f, 0.5f, 0.5f);

        SphereCollider trigger = terminal.AddComponent<SphereCollider>();
        trigger.isTrigger = true;
        trigger.radius = 2.5f;

        GameObject promptCanvasObj = new GameObject("InteractPrompt");
        promptCanvasObj.transform.SetParent(terminal.transform);
        promptCanvasObj.transform.localPosition = new Vector3(0f, 1.5f, 0f);
        Canvas promptCanvas = promptCanvasObj.AddComponent<Canvas>();
        promptCanvas.renderMode = RenderMode.WorldSpace;
        promptCanvasObj.transform.localScale = Vector3.one * 0.01f;
        promptCanvasObj.AddComponent<CanvasScaler>();
        promptCanvasObj.AddComponent<GraphicRaycaster>();

        GameObject promptTextObj = new GameObject("PromptText");
        promptTextObj.transform.SetParent(promptCanvasObj.transform);
        Text promptText = promptTextObj.AddComponent<Text>();
        promptText.text = "Press E to interact";
        promptText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        promptText.alignment = TextAnchor.MiddleCenter;
        promptText.rectTransform.sizeDelta = new Vector2(400f, 60f);
        promptText.rectTransform.localPosition = Vector3.zero;

        promptCanvasObj.SetActive(false);

        TerminalInteractable interactable = terminal.AddComponent<TerminalInteractable>();
        interactable.level = level;
        interactable.interactPrompt = promptCanvasObj;
        interactable.linkedDoor = door.GetComponent<DoorController>();
        // interactable.mlPuzzleUI is wired in WireTerminal() after the Canvas exists

        return terminal;
    }

    // ------------------------------------------------------------------
    // Player
    // ------------------------------------------------------------------
    private static GameObject BuildPlayer()
    {
        GameObject player = new GameObject("Player");
        player.transform.position = new Vector3(0f, 1f, 0f);

        CharacterController cc = player.AddComponent<CharacterController>();
        cc.radius = 0.4f;
        cc.height = 1.8f;
        cc.center = new Vector3(0f, 0.9f, 0f);

        GameObject model = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        model.name = "PlayerModel";
        model.transform.SetParent(player.transform);
        model.transform.localPosition = new Vector3(0f, 0.9f, 0f);
        Object.DestroyImmediate(model.GetComponent<CapsuleCollider>()); // CharacterController already handles collision

        GameObject fpRig = new GameObject("FirstPersonCameraRig");
        fpRig.transform.SetParent(player.transform);
        fpRig.transform.localPosition = new Vector3(0f, 1.6f, 0f);
        GameObject fpCamObj = new GameObject("FirstPersonCamera");
        fpCamObj.transform.SetParent(fpRig.transform);
        fpCamObj.transform.localPosition = Vector3.zero;
        Camera fpCam = fpCamObj.AddComponent<Camera>();
        fpCamObj.AddComponent<AudioListener>();

        GameObject tpRig = new GameObject("ThirdPersonCameraRig");
        tpRig.transform.SetParent(player.transform);
        tpRig.transform.localPosition = new Vector3(0f, 2f, -4f);
        GameObject tpCamObj = new GameObject("ThirdPersonCamera");
        tpCamObj.transform.SetParent(tpRig.transform);
        tpCamObj.transform.localPosition = Vector3.zero;
        Camera tpCam = tpCamObj.AddComponent<Camera>();
        tpCamObj.SetActive(false); // first-person is the default start mode

        PlayerController controller = player.AddComponent<PlayerController>();
        controller.firstPersonCamera = fpCam;
        controller.thirdPersonCamera = tpCam;
        controller.thirdPersonLookTarget = player.transform;
        controller.playerModel = model;
        controller.startInFirstPerson = true;
        model.SetActive(false); // hidden by default since we start in first-person

        // Remove Unity's default Main Camera if present, since the rig cameras replace it
        Camera mainCam = Camera.main;
        if (mainCam != null && mainCam.gameObject.name == "Main Camera")
        {
            Object.DestroyImmediate(mainCam.gameObject);
        }

        if (System.Array.IndexOf(UnityEditorInternal.InternalEditorUtility.tags, "Player") >= 0)
        {
            player.tag = "Player";
        }
        else
        {
            Debug.LogWarning("[BlackVault] 'Player' tag doesn't exist in this project. " +
                              "Add it via Edit > Project Settings > Tags and Layers, " +
                              "then manually tag the Player GameObject.");
        }

        return player;
    }

    // ------------------------------------------------------------------
    // ML Puzzle UI
    // ------------------------------------------------------------------
    private static GameObject BuildMLPuzzleCanvas(GameObject player)
    {
        GameObject canvasObj = new GameObject("Canvas_MLPuzzle");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasObj.AddComponent<CanvasScaler>();
        canvasObj.AddComponent<GraphicRaycaster>();

        GameObject panel = new GameObject("PuzzlePanel");
        panel.transform.SetParent(canvasObj.transform, false);
        Image panelBg = panel.AddComponent<Image>();
        panelBg.color = new Color(0.05f, 0.05f, 0.07f, 0.95f);
        RectTransform panelRect = panel.GetComponent<RectTransform>();
        panelRect.anchorMin = new Vector2(0.08f, 0.06f);
        panelRect.anchorMax = new Vector2(0.92f, 0.94f);
        panelRect.offsetMin = Vector2.zero;
        panelRect.offsetMax = Vector2.zero;

        // --- Mission info, top of panel ("data name and task") ---
        Text missionInfoText = CreateUIText(panel.transform, "MissionInfoText", "Loading mission...", new Vector2(0f, 380f));
        missionInfoText.fontSize = 20;
        missionInfoText.rectTransform.sizeDelta = new Vector2(900f, 90f);

        Text statsText = CreateUIText(panel.transform, "StatsText", "", new Vector2(0f, 320f));

        // --- Code editor: TMP_InputField (invisible text) + TMP overlay (highlighted) ---
        GameObject editorRoot = new GameObject("CodeEditorField", typeof(RectTransform));
        editorRoot.transform.SetParent(panel.transform, false);
        RectTransform editorRect = editorRoot.GetComponent<RectTransform>();
        editorRect.anchoredPosition = new Vector2(0f, -20f);
        editorRect.sizeDelta = new Vector2(900f, 480f);

        Image editorBg = editorRoot.AddComponent<Image>();
        editorBg.color = new Color(0.08f, 0.08f, 0.1f, 1f);

        // Highlighted overlay (behind, renders the colored text)
        GameObject overlayObj = new GameObject("HighlightOverlay", typeof(RectTransform));
        overlayObj.transform.SetParent(editorRoot.transform, false);
        RectTransform overlayRect = overlayObj.GetComponent<RectTransform>();
        overlayRect.anchorMin = Vector2.zero;
        overlayRect.anchorMax = Vector2.one;
        overlayRect.offsetMin = new Vector2(10f, 10f);
        overlayRect.offsetMax = new Vector2(-10f, -10f);
        TMPro.TextMeshProUGUI overlayText = overlayObj.AddComponent<TMPro.TextMeshProUGUI>();
        overlayText.fontSize = 16;
        overlayText.richText = true;
        overlayText.raycastTarget = false;
        overlayText.color = Color.white;
        overlayText.alignment = TMPro.TextAlignmentOptions.TopLeft;

        // Actual editable field (in front, text made invisible so only the overlay is seen)
        GameObject fieldTextObj = new GameObject("Text", typeof(RectTransform));
        fieldTextObj.transform.SetParent(editorRoot.transform, false);
        RectTransform fieldTextRect = fieldTextObj.GetComponent<RectTransform>();
        fieldTextRect.anchorMin = Vector2.zero;
        fieldTextRect.anchorMax = Vector2.one;
        fieldTextRect.offsetMin = new Vector2(10f, 10f);
        fieldTextRect.offsetMax = new Vector2(-10f, -10f);
        TMPro.TextMeshProUGUI fieldText = fieldTextObj.AddComponent<TMPro.TextMeshProUGUI>();
        fieldText.fontSize = 16;
        fieldText.color = new Color(1f, 1f, 1f, 0f); // invisible — the overlay shows the highlighted version
        fieldText.alignment = TMPro.TextAlignmentOptions.TopLeft;

        TMPro.TMP_InputField inputField = editorRoot.AddComponent<TMPro.TMP_InputField>();
        inputField.textComponent = fieldText;
        inputField.textViewport = editorRect;
        inputField.lineType = TMPro.TMP_InputField.LineType.MultiLineNewline;
        inputField.fontAsset = fieldText.font;

        CodeEditorField codeEditor = editorRoot.AddComponent<CodeEditorField>();
        codeEditor.inputField = inputField;
        codeEditor.highlightOverlay = overlayText;

        // --- Buttons + result text, bottom of panel ---
        Button runButton = CreateUIButton(panel.transform, "RunButton", "Run", new Vector2(-80f, -290f));
        Button closeButton = CreateUIButton(panel.transform, "CloseButton", "Close", new Vector2(80f, -290f));
        Text resultText = CreateUIText(panel.transform, "ResultText", "", new Vector2(0f, -340f));
        resultText.rectTransform.sizeDelta = new Vector2(900f, 60f);

        MLPuzzleUI puzzleUI = canvasObj.AddComponent<MLPuzzleUI>();
        puzzleUI.panelRoot = panel;
        puzzleUI.missionInfoText = missionInfoText;
        puzzleUI.statsText = statsText;
        puzzleUI.codeEditor = codeEditor;
        puzzleUI.resultText = resultText;
        puzzleUI.runButton = runButton;
        puzzleUI.closeButton = closeButton;
        puzzleUI.player = player.GetComponent<PlayerController>();

        panel.SetActive(false);

        return canvasObj;
    }

    private static void WireTerminal(GameObject terminal, GameObject canvas, GameObject door)
    {
        TerminalInteractable interactable = terminal.GetComponent<TerminalInteractable>();
        interactable.mlPuzzleUI = canvas.GetComponent<MLPuzzleUI>();
    }

    // ------------------------------------------------------------------
    // UI element helpers
    // ------------------------------------------------------------------
    private static Text CreateUIText(Transform parent, string name, string content, Vector2 anchoredPos)
    {
        GameObject obj = new GameObject(name);
        obj.transform.SetParent(parent, false);
        Text text = obj.AddComponent<Text>();
        text.text = content;
        text.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        text.color = Color.white;
        text.alignment = TextAnchor.MiddleLeft;
        RectTransform rect = obj.GetComponent<RectTransform>();
        rect.sizeDelta = new Vector2(500f, 30f);
        rect.anchoredPosition = anchoredPos;
        return text;
    }

    private static Toggle CreateUIToggle(Transform parent, string name, string label, Vector2 anchoredPos)
    {
        GameObject obj = new GameObject(name);
        obj.transform.SetParent(parent, false);
        Toggle toggle = obj.AddComponent<Toggle>();
        RectTransform rect = obj.GetComponent<RectTransform>();
        rect.sizeDelta = new Vector2(220f, 30f);
        rect.anchoredPosition = anchoredPos;

        GameObject labelObj = new GameObject("Label");
        labelObj.transform.SetParent(obj.transform, false);
        Text labelText = labelObj.AddComponent<Text>();
        labelText.text = label;
        labelText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        labelText.color = Color.white;
        RectTransform labelRect = labelObj.GetComponent<RectTransform>();
        labelRect.anchoredPosition = new Vector2(40f, 0f);
        labelRect.sizeDelta = new Vector2(180f, 30f);

        return toggle;
    }

    private static Dropdown CreateUIDropdown(Transform parent, string name, Vector2 anchoredPos)
    {
        GameObject obj = new GameObject(name);
        obj.transform.SetParent(parent, false);
        obj.AddComponent<Image>();
        Dropdown dropdown = obj.AddComponent<Dropdown>();
        RectTransform rect = obj.GetComponent<RectTransform>();
        rect.sizeDelta = new Vector2(200f, 30f);
        rect.anchoredPosition = anchoredPos;
        return dropdown;
    }

    private static Button CreateUIButton(Transform parent, string name, string label, Vector2 anchoredPos)
    {
        GameObject obj = new GameObject(name);
        obj.transform.SetParent(parent, false);
        Image bg = obj.AddComponent<Image>();
        bg.color = new Color(0.2f, 0.6f, 0.9f);
        Button button = obj.AddComponent<Button>();
        RectTransform rect = obj.GetComponent<RectTransform>();
        rect.sizeDelta = new Vector2(120f, 40f);
        rect.anchoredPosition = anchoredPos;

        GameObject labelObj = new GameObject("Label");
        labelObj.transform.SetParent(obj.transform, false);
        Text labelText = labelObj.AddComponent<Text>();
        labelText.text = label;
        labelText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        labelText.alignment = TextAnchor.MiddleCenter;
        labelText.color = Color.white;
        RectTransform labelRect = labelObj.GetComponent<RectTransform>();
        labelRect.anchorMin = Vector2.zero;
        labelRect.anchorMax = Vector2.one;
        labelRect.offsetMin = Vector2.zero;
        labelRect.offsetMax = Vector2.zero;

        return button;
    }
}