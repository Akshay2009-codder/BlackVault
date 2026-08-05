using UnityEngine;
using TMPro;
using BlackVault.Networking;

namespace BlackVault.UI
{
    public class PlayerHUD : MonoBehaviour
    {
        [Header("UI Elements")]
        public TextMeshProUGUI xpText;
        public TextMeshProUGUI rankText;
        public TextMeshProUGUI levelText;

        void Start()
        {
            RefreshHUD();
        }

        public void RefreshHUD()
        {
            if (ApiClient.Instance != null)
            {
                ApiClient.Instance.GetPlayerProgress(
                    (progress) => 
                    {
                        if (xpText != null) xpText.text = $"XP: {progress.xp}";
                        if (rankText != null) rankText.text = $"RANK: {progress.rank.ToUpper()}";
                        if (levelText != null) levelText.text = $"LEVEL CAP: {progress.level_reached}";
                    },
                    (err) => 
                    {
                        Debug.LogError("Failed to load player progress: " + err);
                    }
                );
            }
            else
            {
                Debug.LogWarning("ApiClient not found. Cannot refresh HUD.");
            }
        }
    }
}
