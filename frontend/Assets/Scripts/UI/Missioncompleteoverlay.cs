// MissionCompleteOverlay.cs — BlackVault
//
// Shown right after a puzzle is solved — a brief "incoming transmission"
// screen (the GTA-style mission-end phone call feel) that records this
// level as complete (via PlayerPrefs, so it persists between sessions)
// and lets the player return to the mission hub for the next objective.

using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;

public class MissionCompleteOverlay : MonoBehaviour
{
    public GameObject panelRoot;
    public Text messageText;
    public Button continueButton;

    [Tooltip("Must exactly match the Hub scene's name as added in File > Build Settings.")]
    public string hubSceneName = "00_MissionHub";

    private void Awake()
    {
        if (panelRoot != null) panelRoot.SetActive(false);
        if (continueButton != null) continueButton.onClick.AddListener(OnContinue);
    }

    /// <summary>
    /// Call this when a terminal's puzzle is solved. Marks the level
    /// complete in PlayerPrefs and shows the transmission screen.
    /// </summary>
    public void Show(int levelNumber, string flavorText)
    {
        PlayerPrefs.SetInt($"BV_Level{levelNumber}_Complete", 1);
        PlayerPrefs.Save();

        if (messageText != null) messageText.text = flavorText;
        if (panelRoot != null) panelRoot.SetActive(true);

        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;
    }

    private void OnContinue()
    {
        SceneManager.LoadScene(hubSceneName);
    }
}