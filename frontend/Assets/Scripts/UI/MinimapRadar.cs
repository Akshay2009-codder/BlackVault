// MinimapRadar.cs — Circular CRT Minimap Radar HUD Component
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace BlackVault.UI
{
    public class MinimapRadar : MonoBehaviour
    {
        [Header("Radar Settings")]
        public Transform playerTransform;
        public RectTransform radarBlipContainer;
        public RectTransform radarSweepLine;
        public float radarScale = 2.0f;
        public float sweepRotationSpeed = 120.0f;

        [Header("UI Text Displays")]
        public TextMeshProUGUI sectorText;
        public TextMeshProUGUI coordinatesText;

        private void Update()
        {
            if (playerTransform == null)
            {
                GameObject p = GameObject.FindWithTag("Player");
                if (p != null) playerTransform = p.transform;
            }

            // Rotate radar sweep line
            if (radarSweepLine != null)
            {
                radarSweepLine.Rotate(0, 0, -sweepRotationSpeed * Time.deltaTime);
            }

            // Update player coordinate readout
            if (playerTransform != null && coordinatesText != null)
            {
                Vector3 pos = playerTransform.position;
                coordinatesText.text = $"X: {pos.x:F1} Y: {pos.z:F1}";
            }
        }

        public void SetSectorTitle(string title)
        {
            if (sectorText != null)
            {
                sectorText.text = title.ToUpper();
            }
        }
    }
}
