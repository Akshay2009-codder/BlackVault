using UnityEngine;

namespace BlackVault.Interaction
{
    [RequireComponent(typeof(Animator))]
    public class DoorController : MonoBehaviour
    {
        public string requiredChallengeId;
        private Animator animator;
        private bool isOpen = false;

        void Start()
        {
            animator = GetComponent<Animator>();
        }

        public void UnlockDoor(string challengeId)
        {
            if (!isOpen && challengeId == requiredChallengeId)
            {
                isOpen = true;
                animator.SetTrigger("Open");
                Debug.Log($"Door {gameObject.name} unlocked. Challenge {challengeId} completed.");
            }
        }
    }
}
