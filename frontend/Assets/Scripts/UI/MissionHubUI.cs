// MissionHubUI.cs — BlackVault
//
// Runtime controller for the Mission Hub / Level Select screen.
// Attached to Canvas_Hub by MissionHubBuilder.
//
// Checks PlayerPrefs on Start(), updates button text, interactable status,
// and background colors based on completion state, and registers runtime
// onClick listeners for scene loading.

using System;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.SceneManagement;

public class MissionHubUI : MonoBehaviour
{
    [Serializable]
    public class LevelButtonEntry
    {
        public int level;
        public string title;
        public string sceneName;
        public Button button;
        public Text labelText;
        public Image bgImage;
    }

    public LevelButtonEntry[] levelButtons;

    private void Start()
    {
        // Reset mouse cursor for UI navigation
        Cursor.lockState = CursorLockMode.None;
        Cursor.visible = true;

        RefreshHub();
    }

    public void RefreshHub()
    {
        if (levelButtons == null) return;

        for (int i = 0; i < levelButtons.Length; i++)
        {
            var entry = levelButtons[i];
            if (entry == null) continue;

            int level = entry.level;
            bool isComplete = PlayerPrefs.GetInt($"BV_Level{level}_Complete", 0) == 1;
            bool isUnlocked = level == 1 || PlayerPrefs.GetInt($"BV_Level{level - 1}_Complete", 0) == 1;

            if (entry.labelText != null)
            {
                entry.labelText.text = isComplete ? $"✔ {entry.title}  [COMPLETE]"
                                     : isUnlocked ? entry.title
                                     : $"🔒 {entry.title}  [LOCKED]";
                entry.labelText.color = Color.white;
            }

            if (entry.bgImage != null)
            {
                entry.bgImage.color = isComplete ? new Color(0.2f, 0.55f, 0.3f)
                                     : isUnlocked ? new Color(0.25f, 0.3f, 0.4f)
                                     : new Color(0.2f, 0.2f, 0.22f);
            }

            if (entry.button != null)
            {
                entry.button.interactable = isUnlocked;
                entry.button.onClick.RemoveAllListeners();

                if (isUnlocked)
                {
                    string targetScene = entry.sceneName;
                    entry.button.onClick.AddListener(() => LoadLevelScene(targetScene));
                }
            }
        }
    }

    private void LoadLevelScene(string sceneName)
    {
        Debug.Log($"[BlackVault] MissionHub loading scene: {sceneName}");
        SceneManager.LoadScene(sceneName);
    }
}
