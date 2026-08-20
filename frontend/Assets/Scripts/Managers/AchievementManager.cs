using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using TMPro;
using BlackVault.Networking;

namespace BlackVault.Managers
{
    public class AchievementManager : MonoBehaviour
    {
        [Header("UI Elements")]
        public GameObject achievementPopupPanel;
        public TextMeshProUGUI titleText;
        public TextMeshProUGUI descriptionText;
        
        [Header("Settings")]
        public float popupDuration = 4f;
        public float pollInterval = 10f; // How often to check for new achievements

        private HashSet<string> knownUnlocked = new HashSet<string>();

        void Start()
        {
            if (achievementPopupPanel != null)
                achievementPopupPanel.SetActive(false);
                
            // Start polling loop
            StartCoroutine(PollAchievementsLoop());
        }

        private IEnumerator PollAchievementsLoop()
        {
            // Initial wait to let ApiClient initialize
            yield return new WaitForSeconds(2f);

            while (true)
            {
                if (ApiClient.Instance != null)
                {
                    ApiClient.Instance.GetAchievements(
                        (achievementList) => {
                            if (achievementList != null && achievementList.achievements != null)
                            {
                                foreach (var ach in achievementList.achievements)
                                {
                                    if (ach.unlocked && !knownUnlocked.Contains(ach.id))
                                    {
                                        knownUnlocked.Add(ach.id);
                                        StartCoroutine(ShowPopup(ach.name, ach.description));
                                    }
                                }
                            }
                        },
                        (err) => {
                            Debug.LogWarning("Could not fetch achievements: " + err);
                        }
                    );
                }
                
                yield return new WaitForSeconds(pollInterval);
            }
        }

        private IEnumerator ShowPopup(string title, string description)
        {
            if (achievementPopupPanel == null) yield break;

            titleText.text = $"ACHIEVEMENT UNLOCKED\n<color=#FFD700>{title}</color>";
            descriptionText.text = description;
            
            achievementPopupPanel.SetActive(true);
            
            yield return new WaitForSeconds(popupDuration);
            
            achievementPopupPanel.SetActive(false);
        }
    }
}
