// MissionCompleteOverlayBuilder.cs — BlackVault
//
// Adds a "phone call" mission-complete overlay to whichever level scene
// is CURRENTLY OPEN, and wires it into that scene's Terminal_01
// automatically. Run this once per level scene (01 through 05).
//
// This is fully additive and self-contained — it does not modify
// LevelBuilder.cs or any script you already have, and only touches the
// currently open scene by adding new objects and setting one field on
// the existing Terminal_01. Safe to run on scenes that already work.
//
// Usage (repeat for each of your 5 level scenes):
//   1. Open the level scene (e.g. 01_Level1_DataCleaning.unity)
//   2. BlackVault > Add Mission Complete Overlay To This Scene
//   3. Ctrl+S to save
//
// Requires MissionCompleteOverlay.cs to already exist in
// Assets/Scripts/UI/ (given in the previous message).

using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

public static class MissionCompleteOverlayBuilder
{
    [MenuItem("BlackVault/Add Mission Complete Overlay To This Scene")]
    public static void BuildOverlay()
    {
        GameObject terminal = GameObject.Find("Terminal_01");
        if (terminal == null)
        {
            Debug.LogError("[BlackVault] No 'Terminal_01' found in the currently open scene. " +
                            "Open a level scene built by BlackVault > Build Level N Scene first.");
            return;
        }

        TerminalInteractable interactable = terminal.GetComponent<TerminalInteractable>();
        if (interactable == null)
        {
            Debug.LogError("[BlackVault] Terminal_01 has no TerminalInteractable component.");
            return;
        }

        var uiResources = new DefaultControls.Resources();

        GameObject canvasObj = new GameObject("Canvas_MissionComplete");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 10; // draw on top of the puzzle canvas
        canvasObj.AddComponent<CanvasScaler>();
        canvasObj.AddComponent<GraphicRaycaster>();

        GameObject panel = DefaultControls.CreatePanel(uiResources);
        panel.name = "TransmissionPanel";
        panel.transform.SetParent(canvasObj.transform, false);
        panel.GetComponent<Image>().color = new Color(0.03f, 0.03f, 0.05f, 0.97f);
        RectTransform panelRect = panel.GetComponent<RectTransform>();
        panelRect.offsetMin = Vector2.zero;
        panelRect.offsetMax = Vector2.zero;

        GameObject headerObj = DefaultControls.CreateText(uiResources);
        headerObj.name = "HeaderText";
        headerObj.transform.SetParent(panel.transform, false);
        Text header = headerObj.GetComponent<Text>();
        header.text = "📞 INCOMING TRANSMISSION";
        header.fontSize = 22;
        header.fontStyle = FontStyle.Bold;
        header.color = new Color(0.4f, 0.9f, 0.5f);
        header.alignment = TextAnchor.MiddleCenter;
        RectTransform headerRect = headerObj.GetComponent<RectTransform>();
        headerRect.anchorMin = new Vector2(0.5f, 0.5f);
        headerRect.anchorMax = new Vector2(0.5f, 0.5f);
        headerRect.anchoredPosition = new Vector2(0f, 80f);
        headerRect.sizeDelta = new Vector2(700f, 40f);

        GameObject messageObj = DefaultControls.CreateText(uiResources);
        messageObj.name = "MessageText";
        messageObj.transform.SetParent(panel.transform, false);
        Text message = messageObj.GetComponent<Text>();
        message.text = "";
        message.fontSize = 18;
        message.color = new Color(0.85f, 0.85f, 0.88f);
        message.alignment = TextAnchor.MiddleCenter;
        RectTransform messageRect = messageObj.GetComponent<RectTransform>();
        messageRect.anchorMin = new Vector2(0.5f, 0.5f);
        messageRect.anchorMax = new Vector2(0.5f, 0.5f);
        messageRect.anchoredPosition = new Vector2(0f, 10f);
        messageRect.sizeDelta = new Vector2(700f, 80f);

        GameObject continueObj = DefaultControls.CreateButton(uiResources);
        continueObj.name = "ContinueButton";
        continueObj.transform.SetParent(panel.transform, false);
        Text continueLabel = continueObj.GetComponentInChildren<Text>();
        continueLabel.text = "Continue";
        continueLabel.color = Color.white;
        continueObj.GetComponent<Image>().color = new Color(0.2f, 0.55f, 0.3f);
        RectTransform continueRect = continueObj.GetComponent<RectTransform>();
        continueRect.anchorMin = new Vector2(0.5f, 0.5f);
        continueRect.anchorMax = new Vector2(0.5f, 0.5f);
        continueRect.anchoredPosition = new Vector2(0f, -80f);
        continueRect.sizeDelta = new Vector2(180f, 45f);

        MissionCompleteOverlay overlay = canvasObj.AddComponent<MissionCompleteOverlay>();
        overlay.panelRoot = panel;
        overlay.messageText = message;
        overlay.continueButton = continueObj.GetComponent<Button>();
        overlay.hubSceneName = "00_MissionHub";

        panel.SetActive(false);

        interactable.missionCompleteOverlay = overlay;

        Debug.Log($"[BlackVault] Mission Complete overlay added and wired to Terminal_01 " +
                  $"(level {interactable.level}). Save the scene now.");
    }
}