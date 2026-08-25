// MapUIOverlay.cs — Full Screen Holographic Facility Map Panel
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace BlackVault.UI
{
    public class MapUIOverlay : MonoBehaviour
    {
        [Header("UI Panels & Toggles")]
        public GameObject mapOverlayCanvas;
        public KeyCode toggleKey = KeyCode.M;

        [Header("Sector Inspector UI")]
        public TextMeshProUGUI sectorTitleText;
        public TextMeshProUGUI clearanceText;
        public TextMeshProUGUI hazardText;
        public Button setWaypointButton;

        private bool isOpen = false;

        private void Update()
        {
            if (Input.GetKeyDown(toggleKey))
            {
                ToggleMapOverlay();
            }
        }

        public void ToggleMapOverlay()
        {
            isOpen = !isOpen;
            if (mapOverlayCanvas != null)
            {
                mapOverlayCanvas.SetActive(isOpen);
            }

            // Lock/Unlock cursor during map viewing
            Cursor.lockState = isOpen ? CursorLockMode.None : CursorLockMode.Locked;
            Cursor.visible = isOpen;
        }

        public void SelectSectorNode(string sectorName, int clearance, bool isUnlocked, string hazard)
        {
            if (sectorTitleText != null) sectorTitleText.text = sectorName.ToUpper();
            if (clearanceText != null)
            {
                clearanceText.text = isUnlocked ? "STATUS: UNLOCKED" : $"SEALED [REQ CLEARANCE: LEVEL {clearance}]";
                clearanceText.color = isUnlocked ? Color.green : Color.red;
            }
            if (hazardText != null) hazardText.text = string.IsNullOrEmpty(hazard) ? "STABLE" : hazard.ToUpper();
        }
    }
}
