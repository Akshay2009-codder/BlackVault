// NeuralLabWorkstation3D.cs — Interactive 3D Neural Network Lab Console
using UnityEngine;

namespace BlackVault.Interaction
{
    public class NeuralLabWorkstation3D : MonoBehaviour
    {
        [Header("Lab Console Visuals")]
        public Transform holoBrainMesh;
        public Light holoEmissiveLight;
        public ParticleSystem bioParticleEmitter;

        [Header("Console Settings")]
        public Color activeNeonColor = Color.magenta;
        public float spinSpeed = 25.0f;
        public float pulseSpeed = 2.0f;

        private void Update()
        {
            // Spin holographic brain model
            if (holoBrainMesh != null)
            {
                holoBrainMesh.Rotate(0, spinSpeed * Time.deltaTime, 0);
            }

            // Pulse emissive light
            if (holoEmissiveLight != null)
            {
                holoEmissiveLight.color = activeNeonColor;
                holoEmissiveLight.intensity = 2.0f + Mathf.Sin(Time.time * pulseSpeed) * 1.0f;
            }
        }
    }
}
