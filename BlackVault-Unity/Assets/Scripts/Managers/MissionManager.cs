// MissionManager.cs — BlackVault (v2 — Lab Redesign)
//
// Manages mission state and displays level-specific themed objectives.
// Each level now has a unique zone name, title, and description that
// matches the facility layout.

using UnityEngine;
using TMPro;

namespace BlackVault.Managers
{
    /// <summary>
    /// Per-level mission metadata matching the lab facility zones.
    /// </summary>
    [System.Serializable]
    public class MissionData
    {
        public string zoneName;        // e.g. "DATA PROCESSING LAB"
        public string missionTitle;    // e.g. "Level 1: Data Preprocessing"
        public string objective;       // full description
        public Color zoneColor;        // accent color for HUD display
    }

    public class MissionManager : MonoBehaviour
    {
        [Header("Mission UI")]
        public TextMeshProUGUI missionObjectiveText;
        public TextMeshProUGUI zoneNameText; // optional — displays zone name on HUD

        /// <summary>
        /// Pre-configured mission data for each level. Index = level - 1.
        /// </summary>
        private static readonly MissionData[] MissionDatabase = new MissionData[]
        {
            // Level 1: Data Processing Lab
            new MissionData
            {
                zoneName = "DATA PROCESSING LAB",
                missionTitle = "Level 1: Data Preprocessing",
                objective = "Access the terminal in the Processing Core and clean the corrupted dataset. " +
                            "Remove null values and duplicates to restore terminal functionality and unlock the security door.",
                zoneColor = new Color(0f, 0.85f, 0.85f) // Cyan/teal
            },
            // Level 2: Analytics Wing
            new MissionData
            {
                zoneName = "ANALYTICS WING",
                missionTitle = "Level 2: Regression — Price Prediction",
                objective = "Train a machine learning model to predict house prices with RMSE ≤ $30,000. " +
                            "Use the terminal in the Regression Lab to calibrate security door overrides.",
                zoneColor = new Color(1f, 0.6f, 0.15f) // Orange/amber
            },
            // Level 3: Medical Research Wing
            new MissionData
            {
                zoneName = "MEDICAL RESEARCH WING",
                missionTitle = "Level 3: Classification — Medical Diagnostic",
                objective = "Classify patient records into Healthy vs Disease to override biometric security locks. " +
                            "Achieve ≥ 75% accuracy in the Diagnostic Lab terminal.",
                zoneColor = new Color(0.9f, 0.15f, 0.2f) // Red/crimson
            },
            // Level 4: Market Intelligence Center
            new MissionData
            {
                zoneName = "MARKET INTELLIGENCE CENTER",
                missionTitle = "Level 4: Clustering — Customer Segmentation",
                objective = "Group store customers into distinct behavior clusters without labels. " +
                            "Achieve a Silhouette Score ≥ 0.35 to bypass the firewall patterns.",
                zoneColor = new Color(0.6f, 0.25f, 0.9f) // Purple/violet
            },
            // Level 5: Financial Security Vault
            new MissionData
            {
                zoneName = "FINANCIAL SECURITY VAULT",
                missionTitle = "Level 5: Anomaly Detection — Fraud Monitor",
                objective = "Detect suspicious financial transactions in the Fraud Detection terminal. " +
                            "Flag anomalies between 2-15% to neutralize the security breach and open the vault.",
                zoneColor = new Color(1f, 0.8f, 0.1f) // Gold/yellow
            }
        };

        void Start()
        {
            // Default: start Level 1 mission. In production this will be
            // set by the scene or a level-loading system.
            StartMissionForLevel(1);
        }

        /// <summary>
        /// Starts mission display for a given level (1-5).
        /// Called by LevelBuilder or scene initialization.
        /// </summary>
        public void StartMissionForLevel(int level)
        {
            int index = Mathf.Clamp(level - 1, 0, MissionDatabase.Length - 1);
            MissionData data = MissionDatabase[index];

            StartMission(data.missionTitle, data.objective);

            if (zoneNameText != null)
            {
                string hexColor = ColorUtility.ToHtmlStringRGB(data.zoneColor);
                zoneNameText.text = $"<color=#{hexColor}>◆ {data.zoneName}</color>";
            }
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

        /// <summary>
        /// Returns the MissionData for a given level. Useful for
        /// LevelBuilder to read zone colors/names at build time.
        /// </summary>
        public static MissionData GetMissionData(int level)
        {
            int index = Mathf.Clamp(level - 1, 0, MissionDatabase.Length - 1);
            return MissionDatabase[index];
        }
    }
}
