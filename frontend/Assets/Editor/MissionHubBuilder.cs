// MissionHubBuilder.cs — BlackVault Editor Tool
//
// Builds the 00_MissionHub scene contents: a Canvas with 5 level
// buttons, a title, and a MissionHubUI component that handles
// PlayerPrefs-based progression (locked/unlocked/complete states).
//
// Usage:
//   1. Open the empty scene Assets/Scenes/00_MissionHub.unity
//   2. Menu: BlackVault > Build Mission Hub Scene
//   3. Save the scene (Ctrl+S)

using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.UI;

public static class MissionHubBuilder
{
    private static readonly string[] LevelLabels = new string[]
    {
        "Level 1 — Data Cleaning",
        "Level 2 — Regression",
        "Level 3 — Classification",
        "Level 4 — Clustering",
        "Level 5 — Anomaly Detection",
        "Final Boss — Core Mainframe"
    };

    private static readonly string[] SceneNames = new string[]
    {
        "01_Level1_DataCleaning",
        "02_Level2_Regression",
        "03_Level3_Classification",
        "04_Level4_Clustering",
        "05_Level5_Anomaly",
        "06_BossRoom"
    };

    [MenuItem("BlackVault/Build Mission Hub Scene")]
    public static void BuildMissionHub()
    {
        // Check if a MissionHubUI already exists to avoid duplicates
        MissionHubUI existingHub = Object.FindAnyObjectByType<MissionHubUI>();
        if (existingHub != null)
        {
            Debug.LogWarning("[BlackVault] MissionHubUI already exists in this scene. Skipping.");
            return;
        }

        EnsureEventSystem();

        var uiResources = new DefaultControls.Resources();

        // --- Camera (scene needs one to render the UI) ---
        if (Camera.main == null)
        {
            GameObject camObj = new GameObject("Main Camera");
            Camera cam = camObj.AddComponent<Camera>();
            cam.clearFlags = CameraClearFlags.SolidColor;
            cam.backgroundColor = new Color(0.06f, 0.06f, 0.10f); // very dark blue-black
            cam.tag = "MainCamera";
            camObj.AddComponent<AudioListener>();
        }

        // --- Canvas ---
        GameObject canvasObj = new GameObject("Canvas_MissionHub");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        CanvasScaler scaler = canvasObj.AddComponent<CanvasScaler>();
        scaler.uiScaleMode = CanvasScaler.ScaleMode.ConstantPixelSize;
        canvasObj.AddComponent<GraphicRaycaster>();

        // --- Background panel ---
        GameObject bgPanel = DefaultControls.CreatePanel(uiResources);
        bgPanel.name = "BackgroundPanel";
        bgPanel.transform.SetParent(canvasObj.transform, false);
        Image bgImage = bgPanel.GetComponent<Image>();
        bgImage.color = new Color(0.08f, 0.08f, 0.12f, 1f);
        RectTransform bgRect = bgPanel.GetComponent<RectTransform>();
        bgRect.anchorMin = Vector2.zero;
        bgRect.anchorMax = Vector2.one;
        bgRect.offsetMin = Vector2.zero;
        bgRect.offsetMax = Vector2.zero;

        // --- Title ---
        GameObject titleObj = DefaultControls.CreateText(uiResources);
        titleObj.name = "TitleText";
        titleObj.transform.SetParent(bgPanel.transform, false);
        Text titleText = titleObj.GetComponent<Text>();
        titleText.text = "BLACK VAULT — MISSION HUB";
        titleText.fontSize = 32;
        titleText.fontStyle = FontStyle.Bold;
        titleText.alignment = TextAnchor.MiddleCenter;
        titleText.color = new Color(0.85f, 0.88f, 0.92f);
        RectTransform titleRect = titleObj.GetComponent<RectTransform>();
        titleRect.anchorMin = new Vector2(0f, 1f);
        titleRect.anchorMax = new Vector2(1f, 1f);
        titleRect.pivot = new Vector2(0.5f, 1f);
        titleRect.anchoredPosition = new Vector2(0f, -30f);
        titleRect.sizeDelta = new Vector2(-40f, 60f);

        // --- Subtitle ---
        GameObject subtitleObj = DefaultControls.CreateText(uiResources);
        subtitleObj.name = "SubtitleText";
        subtitleObj.transform.SetParent(bgPanel.transform, false);
        Text subtitleText = subtitleObj.GetComponent<Text>();
        subtitleText.text = "Select a mission to begin. Complete missions in order to unlock new levels.";
        subtitleText.fontSize = 16;
        subtitleText.alignment = TextAnchor.MiddleCenter;
        subtitleText.color = new Color(0.55f, 0.58f, 0.62f);
        RectTransform subtitleRect = subtitleObj.GetComponent<RectTransform>();
        subtitleRect.anchorMin = new Vector2(0f, 1f);
        subtitleRect.anchorMax = new Vector2(1f, 1f);
        subtitleRect.pivot = new Vector2(0.5f, 1f);
        subtitleRect.anchoredPosition = new Vector2(0f, -95f);
        subtitleRect.sizeDelta = new Vector2(-40f, 30f);

        // --- Attach MissionHubUI ---
        MissionHubUI hub = canvasObj.AddComponent<MissionHubUI>();
        hub.levelButtons = new MissionHubUI.LevelButtonEntry[6];

        // --- 6 Level Buttons ---
        float startY = -130f;
        float buttonHeight = 50f;
        float buttonSpacing = 12f;

        for (int i = 0; i < 6; i++)
        {
            GameObject btnObj = DefaultControls.CreateButton(uiResources);
            btnObj.name = $"LevelButton_{i + 1}";
            btnObj.transform.SetParent(bgPanel.transform, false);

            Image btnImage = btnObj.GetComponent<Image>();
            btnImage.color = new Color(0.20f, 0.50f, 0.85f, 1f); // default unlocked blue

            Text btnLabel = btnObj.GetComponentInChildren<Text>();
            btnLabel.text = LevelLabels[i];
            btnLabel.fontSize = 20;
            btnLabel.fontStyle = FontStyle.Bold;
            btnLabel.color = Color.white;
            btnLabel.alignment = TextAnchor.MiddleCenter;

            // Full-width label
            RectTransform labelRect = btnLabel.GetComponent<RectTransform>();
            labelRect.anchorMin = Vector2.zero;
            labelRect.anchorMax = Vector2.one;
            labelRect.offsetMin = Vector2.zero;
            labelRect.offsetMax = Vector2.zero;

            RectTransform btnRect = btnObj.GetComponent<RectTransform>();
            btnRect.anchorMin = new Vector2(0.5f, 1f);
            btnRect.anchorMax = new Vector2(0.5f, 1f);
            btnRect.pivot = new Vector2(0.5f, 1f);
            float yPos = startY - i * (buttonHeight + buttonSpacing);
            btnRect.anchoredPosition = new Vector2(0f, yPos);
            btnRect.sizeDelta = new Vector2(450f, buttonHeight);

            // Wire the entry in the array
            var entry = new MissionHubUI.LevelButtonEntry();
            entry.level = i + 1;
            entry.title = LevelLabels[i];
            entry.sceneName = SceneNames[i];
            entry.button = btnObj.GetComponent<Button>();
            entry.labelText = btnLabel;
            entry.bgImage = btnImage;
            
            hub.levelButtons[i] = entry;
        }

        // --- Debug Reset Button (bottom of screen) ---
        GameObject resetObj = DefaultControls.CreateButton(uiResources);
        resetObj.name = "ResetProgressButton";
        resetObj.transform.SetParent(bgPanel.transform, false);
        Image resetImage = resetObj.GetComponent<Image>();
        resetImage.color = new Color(0.45f, 0.15f, 0.15f, 1f);
        Text resetLabel = resetObj.GetComponentInChildren<Text>();
        resetLabel.text = "Reset All Progress (Debug)";
        resetLabel.fontSize = 14;
        resetLabel.color = new Color(0.85f, 0.50f, 0.50f);
        RectTransform resetRect = resetObj.GetComponent<RectTransform>();
        resetRect.anchorMin = new Vector2(0.5f, 0f);
        resetRect.anchorMax = new Vector2(0.5f, 0f);
        resetRect.pivot = new Vector2(0.5f, 0f);
        resetRect.anchoredPosition = new Vector2(0f, 20f);
        resetRect.sizeDelta = new Vector2(300f, 40f);

        // Wire reset button to hub's debug method
        Button resetButton = resetObj.GetComponent<Button>();
        resetButton.onClick.AddListener(() => {
            for (int k = 1; k <= 6; k++)
            {
                PlayerPrefs.DeleteKey($"BV_Level{k}_Complete");
            }
            PlayerPrefs.Save();
            Debug.Log("[BlackVault] All level progress reset.");
            hub.RefreshHub();
        });

        EditorUtility.SetDirty(canvasObj);
        EditorSceneManager.MarkSceneDirty(EditorSceneManager.GetActiveScene());

        Debug.Log("[BlackVault] Mission Hub scene built. Save with Ctrl+S.");
    }

    private static void EnsureEventSystem()
    {
        if (UnityEngine.EventSystems.EventSystem.current != null) return;

        GameObject esObj = new GameObject("EventSystem");
        esObj.AddComponent<UnityEngine.EventSystems.EventSystem>();
        esObj.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
    }
}