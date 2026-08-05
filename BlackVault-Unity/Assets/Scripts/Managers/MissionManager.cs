using UnityEngine;
using TMPro;

namespace BlackVault.Managers
{
    public class MissionManager : MonoBehaviour
    {
        [Header("Mission UI")]
        public TextMeshProUGUI missionObjectiveText;

        void Start()
        {
            // Game starts with an ML related mission
            StartMission("Level 1: Data Preprocessing", "Access the terminal and clean the null values from the dataset to open the vault door.");
        }

        public void StartMission(string missionTitle, string objective)
        {
            if (missionObjectiveText != null)
            {
                missionObjectiveText.text = $"<color=#00FF00>{missionTitle}</color>\n{objective}";
                Debug.Log($"Mission Started: {missionTitle}");
            }
            else
            {
                Debug.LogWarning("MissionObjectiveText is not assigned in the MissionManager.");
            }
        }
    }
}
