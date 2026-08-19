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

    private static readonly string[] DefaultFlavorTexts = new[]
    {
        "INCOMING TRANSMISSION...\n\n\"Sector 1 bypass clean. The security logs have been scrubbed of null bytes. Sector 2 firewall credentials unlocked.\"",
        "INCOMING TRANSMISSION...\n\n\"Sector 2 market valuation verified. Regression weights locked into central vault mainframe. Proceed to Sector 3.\"",
        "INCOMING TRANSMISSION...\n\n\"Sector 3 bio-threat signatures classified. Containment protocols engaged. Path to Sector 4 cleared.\"",
        "INCOMING TRANSMISSION...\n\n\"Sector 4 user clusters isolated. Neural network perimeter stabilized. Final breach point in Sector 5 exposed.\"",
        "INCOMING TRANSMISSION...\n\n\"Sector 5 anomaly neutralized. BlackVault core security restored. Mission Accomplished, agent.\""
    };

    private void Awake()
    {
        if (panelRoot != null) panelRoot.SetActive(false);
        if (continueButton != null) continueButton.onClick.AddListener(OnContinue);
    }

    /// <summary>
    /// Call this when a terminal's puzzle is solved. Marks the level
    /// complete in PlayerPrefs and shows the transmission screen.
    /// </summary>
    public void Show(int levelNumber, string flavorText = null)
    {
        PlayerPrefs.SetInt($"BV_Level{levelNumber}_Complete", 1);
        PlayerPrefs.Save();

        if (string.IsNullOrEmpty(flavorText))
        {
            int index = Mathf.Clamp(levelNumber - 1, 0, DefaultFlavorTexts.Length - 1);
            flavorText = DefaultFlavorTexts[index];
        }

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