// MissionBriefingSystemBuilder.cs — BlackVault Phase 2
//
// Matches the same code-gen pattern as MissionCompleteOverlayBuilder.cs
// and LevelBuilder.cs already in this project: run one menu item, it
// builds the UI hierarchy + wires component references for you, in the
// CURRENTLY OPEN scene. Fully additive — doesn't touch any existing
// GameObjects except reading "Player" to wire PlayerController.
//
// Usage:
//   1. Open the scene you want the mission-start sequence to play in
//      (e.g. 01_Level1_DataCleaning.unity).
//   2. BlackVault > Build Mission Briefing System (Phase 2)
//   3. In the Inspector, select "MissionIntro" and customize
//      missionTitle / objective text for this specific level.
//   4. Ctrl+S to save the scene.
//   5. Press Play to test — ring, answer, briefing, Start Mission.
//
// Requires (from the Phase 2 file set) already added to
// Assets/Scripts/Managers/ and Assets/Scripts/UI/:
//   SquadManager.cs, PhoneCallUI.cs, MissionBriefingUI.cs,
//   TeamCardView.cs, RadioChatterUI.cs, MissionIntroSequence.cs

using BlackVault.Managers;
using TMPro;
using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

public static class MissionBriefingSystemBuilder
{
    [MenuItem("BlackVault/Build Mission Briefing System (Phase 2)")]
    public static void Build()
    {
        EnsureEventSystem();
        SquadManager squad = EnsureSquadManager();
        PhoneCallUI phoneCall = BuildPhoneCallCanvas();
        MissionBriefingUI briefing = BuildBriefingCanvas();
        BuildRadioHudCanvas();

        BuildMissionIntro(phoneCall, briefing);

        Debug.Log("[BlackVault] Mission Briefing System built: Canvas_PhoneCall, " +
                  "Canvas_Briefing, Canvas_RadioHUD, SquadManager, and MissionIntro " +
                  "all added to the current scene. Select 'MissionIntro' in the Hierarchy " +
                  "to customize its mission title/objective text, then save the scene.");
    }

    // ------------------------------------------------------------------
    // SquadManager
    // ------------------------------------------------------------------
    private static SquadManager EnsureSquadManager()
    {
        GameObject existing = GameObject.Find("SquadManager");
        if (existing != null)
        {
            return existing.GetComponent<SquadManager>();
        }

        GameObject go = new GameObject("SquadManager");
        return go.AddComponent<SquadManager>();
        // Leave roster empty — SquadManager.Awake() auto-fills DefaultRoster().
    }

    private static void EnsureEventSystem()
    {
        if (Object.FindAnyObjectByType<UnityEngine.EventSystems.EventSystem>() != null) return;
        GameObject es = new GameObject("EventSystem");

        es.AddComponent<UnityEngine.EventSystems.EventSystem>();
        es.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
    }

    // ------------------------------------------------------------------
    // Canvas_PhoneCall
    // ------------------------------------------------------------------
    private static PhoneCallUI BuildPhoneCallCanvas()
    {
        GameObject canvasObj = new GameObject("Canvas_PhoneCall");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 30; // above everything else
        var scaler = canvasObj.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);
        canvasObj.AddComponent<GraphicRaycaster>();

        GameObject panel = new GameObject("CallPanel");
        panel.transform.SetParent(canvasObj.transform, false);
        Image panelImg = panel.AddComponent<Image>();
        panelImg.color = new Color(0.06f, 0.08f, 0.09f, 0.96f);
        RectTransform panelRect = panel.GetComponent<RectTransform>();
        panelRect.anchorMin = new Vector2(0.5f, 0.5f);
        panelRect.anchorMax = new Vector2(0.5f, 0.5f);
        panelRect.sizeDelta = new Vector2(460f, 260f);
        panelRect.anchoredPosition = Vector2.zero;

        Image portrait = CreateImage(panel.transform, "CallerPortrait",
            new Vector2(0f, 70f), new Vector2(90f, 90f), new Color(0.24f, 1f, 0.63f));

        TMP_Text nameText = CreateTMP(panel.transform, "CallerNameText", "UNKNOWN CALLER",
            26, new Color(0.85f, 1f, 0.9f), FontStyles.Bold,
            new Vector2(0f, 10f), new Vector2(400f, 40f));

        TMP_Text statusText = CreateTMP(panel.transform, "CallStatusText", "Incoming transmission...",
            15, new Color(0.6f, 0.75f, 0.7f), FontStyles.Italic,
            new Vector2(0f, -25f), new Vector2(400f, 30f));

        Button answerBtn = CreateButton(panel.transform, "AnswerButton", "Answer",
            new Vector2(-90f, -95f), new Vector2(150f, 46f), new Color(0.15f, 0.55f, 0.32f));

        Button declineBtn = CreateButton(panel.transform, "DeclineButton", "Decline",
            new Vector2(90f, -95f), new Vector2(150f, 46f), new Color(0.5f, 0.18f, 0.2f));

        PhoneCallUI script = canvasObj.AddComponent<PhoneCallUI>();
        script.callPanel = panel;
        script.callerPortrait = portrait;
        script.callerNameText = nameText;
        script.callStatusText = statusText;
        script.answerButton = answerBtn;
        script.declineButton = declineBtn;

        return script;
    }

    // ------------------------------------------------------------------
    // Canvas_Briefing
    // ------------------------------------------------------------------
    private static MissionBriefingUI BuildBriefingCanvas()
    {
        GameObject canvasObj = new GameObject("Canvas_Briefing");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 25;
        var scaler = canvasObj.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);
        canvasObj.AddComponent<GraphicRaycaster>();

        GameObject bg = new GameObject("Background");
        bg.transform.SetParent(canvasObj.transform, false);
        Image bgImg = bg.AddComponent<Image>();
        bgImg.color = new Color(0.03f, 0.04f, 0.05f, 0.97f);
        RectTransform bgRect = bg.GetComponent<RectTransform>();
        bgRect.anchorMin = Vector2.zero;
        bgRect.anchorMax = Vector2.one;
        bgRect.offsetMin = Vector2.zero;
        bgRect.offsetMax = Vector2.zero;

        TMP_Text titleText = CreateTMP(bg.transform, "MissionTitleText", "MISSION BRIEFING",
            34, new Color(0.24f, 1f, 0.63f), FontStyles.Bold,
            new Vector2(0f, 300f), new Vector2(1200f, 50f));

        TMP_Text objectiveText = CreateTMP(bg.transform, "ObjectiveText", "",
            18, new Color(0.85f, 0.9f, 0.9f), FontStyles.Normal,
            new Vector2(0f, 180f), new Vector2(1100f, 140f));
        objectiveText.alignment = TextAlignmentOptions.Top;

        GameObject rosterContainer = new GameObject("RosterContainer");
        rosterContainer.transform.SetParent(bg.transform, false);
        RectTransform rosterRect = rosterContainer.AddComponent<RectTransform>();
        rosterRect.anchorMin = new Vector2(0.5f, 0.5f);
        rosterRect.anchorMax = new Vector2(0.5f, 0.5f);
        rosterRect.anchoredPosition = new Vector2(0f, 0f);
        rosterRect.sizeDelta = new Vector2(1000f, 220f);
        HorizontalLayoutGroup hlg = rosterContainer.AddComponent<HorizontalLayoutGroup>();
        hlg.spacing = 24f;
        hlg.childAlignment = TextAnchor.MiddleCenter;
        hlg.childForceExpandWidth = false;
        hlg.childForceExpandHeight = false;

        GameObject teamCardPrefab = BuildTeamCardPrefab();

        Button startBtn = CreateButton(bg.transform, "StartMissionButton", "▶ START MISSION",
            new Vector2(0f, -320f), new Vector2(260f, 56f), new Color(0.16f, 0.6f, 0.35f));

        MissionBriefingUI script = canvasObj.AddComponent<MissionBriefingUI>();
        script.missionTitleText = titleText;
        script.objectiveText = objectiveText;
        script.rosterContainer = rosterContainer.transform;
        script.teamCardPrefab = teamCardPrefab;
        script.startMissionButton = startBtn;

        return script;
    }

    private static GameObject BuildTeamCardPrefab()
    {
        const string folder = "Assets/Prefabs";
        const string path = folder + "/TeamCard.prefab";

        // Reuse existing prefab if this has already been run once.
        GameObject existing = AssetDatabase.LoadAssetAtPath<GameObject>(path);
        if (existing != null) return existing;

        GameObject card = new GameObject("TeamCard");
        RectTransform cardRect = card.AddComponent<RectTransform>();
        cardRect.sizeDelta = new Vector2(220f, 200f);
        Image cardBg = card.AddComponent<Image>();
        cardBg.color = new Color(0.09f, 0.11f, 0.13f, 0.95f);
        LayoutElement le = card.AddComponent<LayoutElement>();
        le.preferredWidth = 220f;
        le.preferredHeight = 200f;
        card.AddComponent<CanvasGroup>();

        Image portrait = CreateImage(card.transform, "PortraitImage",
            new Vector2(0f, 45f), new Vector2(70f, 70f), Color.gray);

        TMP_Text nameText = CreateTMP(card.transform, "NameText", "CALLSIGN",
            18, Color.white, FontStyles.Bold,
            new Vector2(0f, -15f), new Vector2(200f, 28f));

        TMP_Text roleText = CreateTMP(card.transform, "RoleText", "Role",
            12, new Color(0.65f, 0.7f, 0.7f), FontStyles.Normal,
            new Vector2(0f, -38f), new Vector2(200f, 24f));

        Image accentBar = CreateImage(card.transform, "AccentBar",
            new Vector2(0f, -90f), new Vector2(220f, 5f), Color.cyan);

        TeamCardView view = card.AddComponent<TeamCardView>();
        view.portraitImage = portrait;
        view.nameText = nameText;
        view.roleText = roleText;
        view.accentBar = accentBar;

        if (!AssetDatabase.IsValidFolder(folder))
        {
            AssetDatabase.CreateFolder("Assets", "Prefabs");
        }

        GameObject prefabAsset = PrefabUtility.SaveAsPrefabAsset(card, path);
        Object.DestroyImmediate(card); // remove the scene instance, keep only the asset
        return prefabAsset;
    }

    // ------------------------------------------------------------------
    // Canvas_RadioHUD
    // ------------------------------------------------------------------
    private static void BuildRadioHudCanvas()
    {
        GameObject canvasObj = new GameObject("Canvas_RadioHUD");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 15;
        var scaler = canvasObj.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
        scaler.referenceResolution = new Vector2(1920, 1080);
        canvasObj.AddComponent<GraphicRaycaster>();

        GameObject toast = new GameObject("RadioToast");
        toast.transform.SetParent(canvasObj.transform, false);
        Image toastBg = toast.AddComponent<Image>();
        toastBg.color = new Color(0.05f, 0.07f, 0.08f, 0.9f);
        RectTransform toastRect = toast.GetComponent<RectTransform>();
        toastRect.anchorMin = new Vector2(0f, 0f);
        toastRect.anchorMax = new Vector2(0f, 0f);
        toastRect.pivot = new Vector2(0f, 0f);
        toastRect.anchoredPosition = new Vector2(30f, 30f);
        toastRect.sizeDelta = new Vector2(420f, 90f);
        CanvasGroup cg = toast.AddComponent<CanvasGroup>();

        TMP_Text speakerText = CreateTMP(toast.transform, "SpeakerText", "RADIO — VEX",
            13, new Color(0.24f, 1f, 0.63f), FontStyles.Bold,
            new Vector2(0f, 25f), new Vector2(380f, 24f));
        speakerText.alignment = TextAlignmentOptions.TopLeft;

        TMP_Text messageText = CreateTMP(toast.transform, "MessageText", "",
            14, Color.white, FontStyles.Normal,
            new Vector2(0f, -5f), new Vector2(380f, 55f));
        messageText.alignment = TextAlignmentOptions.TopLeft;

        RadioChatterUI script = canvasObj.AddComponent<RadioChatterUI>();
        script.toastPanel = toast;
        script.toastCanvasGroup = cg;
        script.speakerText = speakerText;
        script.messageText = messageText;

        toast.SetActive(false);
    }

    // ------------------------------------------------------------------
    // MissionIntro orchestrator
    // ------------------------------------------------------------------
    private static void BuildMissionIntro(PhoneCallUI phoneCall, MissionBriefingUI briefing)
    {
        GameObject existing = GameObject.Find("MissionIntro");
        GameObject introObj = existing != null ? existing : new GameObject("MissionIntro");

        MissionIntroSequence intro = introObj.GetComponent<MissionIntroSequence>();
        if (intro == null) intro = introObj.AddComponent<MissionIntroSequence>();

        intro.phoneCallUI = phoneCall;
        intro.missionBriefingUI = briefing;

        GameObject playerObj = GameObject.Find("Player");
        if (playerObj != null)
        {
            intro.player = playerObj.GetComponent<PlayerController>();
        }
        else
        {
            Debug.LogWarning("[BlackVault] No 'Player' GameObject found in this scene — " +
                              "assign MissionIntro.player manually in the Inspector.");
        }
    }

    // ------------------------------------------------------------------
    // Small UI helpers (kept local so this file has no other dependencies)
    // ------------------------------------------------------------------
    private static TMP_Text CreateTMP(Transform parent, string name, string text, int fontSize,
        Color color, FontStyles style, Vector2 anchoredPos, Vector2 sizeDelta)
    {
        GameObject obj = new GameObject(name);
        obj.transform.SetParent(parent, false);
        TextMeshProUGUI tmp = obj.AddComponent<TextMeshProUGUI>();
        tmp.text = text;
        tmp.fontSize = fontSize;
        tmp.color = color;
        tmp.fontStyle = style;
        tmp.alignment = TextAlignmentOptions.Center;

        RectTransform rect = obj.GetComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.5f, 0.5f);
        rect.anchorMax = new Vector2(0.5f, 0.5f);
        rect.anchoredPosition = anchoredPos;
        rect.sizeDelta = sizeDelta;

        return tmp;
    }

    private static Image CreateImage(Transform parent, string name, Vector2 anchoredPos,
        Vector2 sizeDelta, Color color)
    {
        GameObject obj = new GameObject(name);
        obj.transform.SetParent(parent, false);
        Image img = obj.AddComponent<Image>();
        img.color = color;

        RectTransform rect = obj.GetComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.5f, 0.5f);
        rect.anchorMax = new Vector2(0.5f, 0.5f);
        rect.anchoredPosition = anchoredPos;
        rect.sizeDelta = sizeDelta;

        return img;
    }

    private static Button CreateButton(Transform parent, string name, string label,
        Vector2 anchoredPos, Vector2 sizeDelta, Color bgColor)
    {
        GameObject obj = new GameObject(name);
        obj.transform.SetParent(parent, false);
        Image img = obj.AddComponent<Image>();
        img.color = bgColor;
        Button btn = obj.AddComponent<Button>();

        RectTransform rect = obj.GetComponent<RectTransform>();
        rect.anchorMin = new Vector2(0.5f, 0.5f);
        rect.anchorMax = new Vector2(0.5f, 0.5f);
        rect.anchoredPosition = anchoredPos;
        rect.sizeDelta = sizeDelta;

        CreateTMP(obj.transform, "Label", label, 15, Color.white, FontStyles.Bold,
            Vector2.zero, sizeDelta);

        return btn;
    }
}.