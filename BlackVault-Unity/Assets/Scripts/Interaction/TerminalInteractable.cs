using UnityEngine;
using BlackVault.Player;
using BlackVault.UI;

namespace BlackVault.Interaction
{
    public enum TerminalType
    {
        Preprocess,
        Train,
        Corrupt
    }

    [RequireComponent(typeof(BoxCollider2D))]
    public class TerminalInteractable : MonoBehaviour
    {
        public string associatedChallengeId;
        public TerminalType terminalType = TerminalType.Preprocess;
        
        private bool isPlayerNear = false;
        private PlayerController player;
        
        [Header("UI References")]
        public IDEController ideController;

        void Start()
        {
            // Ensure collider is set to trigger
            var col = GetComponent<BoxCollider2D>();
            if (col != null) col.isTrigger = true;
        }

        void Update()
        {
            if (isPlayerNear && Input.GetKeyDown(KeyCode.E))
            {
                if (ideController != null && player != null)
                {
                    // Open the IDE UI and pass the terminal type
                    ideController.OpenIDE(associatedChallengeId, terminalType);
                    
                    // Lock player movement and trigger typing animation
                    player.SetInteractingState(true);
                    
                    // Unlock cursor
                    Cursor.lockState = CursorLockMode.None;
                    Cursor.visible = true;
                }
            }
        }

        private void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Player"))
            {
                isPlayerNear = true;
                player = other.GetComponent<PlayerController>();
                // TODO: Show UI prompt (e.g., "Press E to Interact")
            }
        }

        private void OnTriggerExit2D(Collider2D other)
        {
            if (other.CompareTag("Player"))
            {
                isPlayerNear = false;
                player = null;
                // TODO: Hide UI prompt
            }
        }
    }
}
