// NeuralNetworkVisualizerUI.cs — Holographic 3D Neural Network Projection UI
using UnityEngine;
using TMPro;

namespace BlackVault.UI
{
    public class NeuralNetworkVisualizerUI : MonoBehaviour
    {
        [Header("Holographic Displays")]
        public TextMeshProUGUI accuracyDisplayText;
        public TextMeshProUGUI epochLossText;
        public LineRenderer synapseLineRenderer;

        public void DisplayTrainingResults(float accuracy, float finalLoss)
        {
            if (accuracyDisplayText != null)
            {
                accuracyDisplayText.text = $"ACCURACY: {accuracy * 100.0f:F1}%";
                accuracyDisplayText.color = accuracy >= 0.75f ? Color.green : Color.red;
            }

            if (epochLossText != null)
            {
                epochLossText.text = $"FINAL LOSS: {finalLoss:F4}";
            }
        }
    }
}
