// OperativeCharacter3D.cs — 3D Operative Character Avatar Controller for Unity
using UnityEngine;

namespace BlackVault.Player
{
    public class OperativeCharacter3D : MonoBehaviour
    {
        [Header("Character Identity")]
        public string operativeName = "Operative Vesper";
        public string callsign = "ALPHA-1";
        public Color armorColor = new Color(0.0f, 0.94f, 1.0f); // Electric Cyan

        [Header("3D Visual Components")]
        public Transform visorMesh;
        public Light visorLight;
        public Renderer armorRenderer;

        [Header("Animation & Floating Effects")]
        public float bobbingSpeed = 2.0f;
        public float bobbingAmount = 0.08f;
        public float rotationSpeed = 30.0f;

        private Vector3 startPosition;

        private void Start()
        {
            startPosition = transform.localPosition;
            ApplyCharacterTheme();
        }

        private void Update()
        {
            // Gentle idle bobbing & rotation animation
            float newY = startPosition.y + Mathf.Sin(Time.time * bobbingSpeed) * bobbingAmount;
            transform.localPosition = new Vector3(transform.localPosition.x, newY, transform.localPosition.z);
            transform.Rotate(0, rotationSpeed * Time.deltaTime, 0);
        }

        public void ApplyCharacterTheme()
        {
            if (visorLight != null)
            {
                visorLight.color = armorColor;
            }

            if (armorRenderer != null && armorRenderer.material != null)
            {
                armorRenderer.material.color = armorColor;
                armorRenderer.material.SetColor("_EmissionColor", armorColor * 0.8f);
            }
        }
    }
}
