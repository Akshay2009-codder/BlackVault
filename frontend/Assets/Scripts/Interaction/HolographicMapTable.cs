// HolographicMapTable.cs — 3D Holographic Facility Map Table Interactable
using UnityEngine;
using BlackVault.UI;

namespace BlackVault.Interaction
{
    public class HolographicMapTable : MonoBehaviour
    {
        [Header("Hologram Visual Effects")]
        public Transform hologramMeshTransform;
        public Light holoPointLight;
        public float rotationSpeed = 15.0f;
        public float floatAmplitude = 0.05f;
        public float floatFrequency = 1.5f;

        [Header("Interaction Prompt")]
        public string promptText = "Press [E] to Access Tactical Facility Map";
        public MapUIOverlay mapOverlayUI;

        private Vector3 initialPos;
        private bool isPlayerInRange = false;

        private void Start()
        {
            if (hologramMeshTransform != null)
            {
                initialPos = hologramMeshTransform.localPosition;
            }
        }

        private void Update()
        {
            // Animate hologram floating & spinning
            if (hologramMeshTransform != null)
            {
                hologramMeshTransform.Rotate(0, rotationSpeed * Time.deltaTime, 0);
                float newY = initialPos.y + Mathf.Sin(Time.time * floatFrequency) * floatAmplitude;
                hologramMeshTransform.localPosition = new Vector3(initialPos.x, newY, initialPos.z);
            }

            // Interact trigger
            if (isPlayerInRange && Input.GetKeyDown(KeyCode.E))
            {
                if (mapOverlayUI != null)
                {
                    mapOverlayUI.ToggleMapOverlay();
                }
            }
        }

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                isPlayerInRange = true;
            }
        }

        private void OnTriggerExit(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                isPlayerInRange = false;
            }
        }
    }
}
