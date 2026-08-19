// MissionHubBuilder.cs — BlackVault
//
// Builds a standalone Mission Hub / Level Select scene — 5 buttons,
// one per level, showing "COMPLETE" for levels the player already
// finished (via PlayerPrefs, set by MissionCompleteOverlay) and
// locking any level whose PREVIOUS level isn't complete yet.
//
// This is a completely separate file from LevelBuilder.cs — it does
// not modify or depend on it, so it carries zero risk to your already
// working level scenes.
//
// Usage:
//   1. Place at Assets/Editor/MissionHubBuilder.cs
//   2. File > New Scene > Empty
//   3. BlackVault > Build Mission Hub Scene
//   4. File > Save As > name it exactly "00_MissionHub.unity"
//   5. File > Build Settings > add ALL scenes (Hub + all 5 levels),
//      Hub scene should be index 0 (first in the list) so it loads first.

using UnityEditor;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;

public static class MissionHubBuilder
{
    private static readonly (int level, string title, string sceneName)[] Levels = new[]
    {
        (1, "Sector 1 — Security Bypass", "01_Level1_DataCleaning"),
        (2, "Sector 2 — Price Prediction Lock", "02_Level2_Regression"),
        (3, "Sector 3 — Bio-Threat Scanner", "03_Level3_Classification"),
        (4, "Sector 4 — Customer Segmentation", "04_Level4_Clustering"),
        (5, "Sector 5 — Fraud Isolation Firewall", "05_Level5_Anomaly"),
    };

    [MenuItem("BlackVault/Build Mission Hub Scene")]
    public static void BuildHub()
    {
        EnsureEventSystem();

        GameObject cameraObj = new GameObject("Main Camera");
        Camera cam = cameraObj.AddComponent<Camera>();
        cam.clearFlags = CameraClearFlags.SolidColor;
        cam.backgroundColor = new Color(0.08f, 0.08f, 0.1f);
        cameraObj.AddComponent<AudioListener>();

        var uiResources = new DefaultControls.Resources();

        GameObject canvasObj = new GameObject("Canvas_Hub");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasObj.AddComponent<CanvasScaler>();
        canvasObj.AddComponent<GraphicRaycaster>();

        GameObject titleObj = DefaultControls.CreateText(uiResources);
        titleObj.name = "TitleText";
        titleObj.transform.SetParent(canvasObj.transform, false);
        Text title = titleObj.GetComponent<Text>();
        title.text = "BLACKVAULT — SELECT SECTOR";
        title.fontSize = 32;
        title.fontStyle = FontStyle.Bold;
        title.color = new Color(0.95f, 0.35f, 0.35f);
        title.alignment = TextAnchor.MiddleCenter;
        RectTransform titleRect = titleObj.GetComponent<RectTransform>();
        titleRect.anchorMin = new Vector2(0f, 1f);
        titleRect.anchorMax = new Vector2(1f, 1f);
        titleRect.pivot = new Vector2(0.5f, 1f);
        titleRect.anchoredPosition = new Vector2(0f, -60f);
        titleRect.sizeDelta = new Vector2(-80f, 60f);

        MissionHubUI hubUI = canvasObj.AddComponent<MissionHubUI>();
        hubUI.levelButtons = new MissionHubUI.LevelButtonEntry[Levels.Length];

        for (int i = 0; i < Levels.Length; i++)
        {
            var (level, levelTitle, sceneName) = Levels[i];

            GameObject btnObj = DefaultControls.CreateButton(uiResources);
            btnObj.name = $"Level{level}Button";
            btnObj.transform.SetParent(canvasObj.transform, false);

            Text btnLabel = btnObj.GetComponentInChildren<Text>();
            btnLabel.text = levelTitle;
            btnLabel.color = Color.white;
            btnLabel.fontSize = 16;

            Image btnBg = btnObj.GetComponent<Image>();
            btnBg.color = new Color(0.25f, 0.3f, 0.4f);

            RectTransform btnRect = btnObj.GetComponent<RectTransform>();
            btnRect.anchorMin = btnRect.anchorMax = new Vector2(0.5f, 1f);
            btnRect.pivot = new Vector2(0.5f, 1f);
            btnRect.anchoredPosition = new Vector2(0f, -160f - i * 80f);
            btnRect.sizeDelta = new Vector2(500f, 55f);

            Button button = btnObj.GetComponent<Button>();

            hubUI.levelButtons[i] = new MissionHubUI.LevelButtonEntry
            {
                level = level,
                title = levelTitle,
                sceneName = sceneName,
                button = button,
                labelText = btnLabel,
                bgImage = btnBg
            };
        }

        Debug.Log("[BlackVault] Mission Hub built with runtime MissionHubUI attached. Save as 00_MissionHub.unity, " +
                   "then add it (and all 5 level scenes) to File > Build Settings.");
    }

    private static void EnsureEventSystem()
    {
        if (UnityEngine.EventSystems.EventSystem.current != null) return;
        GameObject esObj = new GameObject("EventSystem");
        esObj.AddComponent<UnityEngine.EventSystems.EventSystem>();
        esObj.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
    }
}