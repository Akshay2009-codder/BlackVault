// SectorDoorConnector.cs — Cross-Sector Airlock Connection Controller
using UnityEngine;
using BlackVault.Map;

namespace BlackVault.Interaction
{
    public class SectorDoorConnector : MonoBehaviour
    {
        [Header("Door & Sector Link Metadata")]
        public string doorId = "DOOR_SEC_01";
        public string sourceSectorId = "SEC_01";
        public string targetSectorId = "SEC_02";
        public int requiredClearanceLevel = 1;
        public bool isUnlocked = false;

        [Header("Door Component References")]
        public DoorController doorController;

        private void OnTriggerEnter(Collider other)
        {
            if (other.CompareTag("Player"))
            {
                AttemptDoorAccess();
            }
        }

        public void AttemptDoorAccess()
        {
            if (isUnlocked)
            {
                OpenDoorAndTransition();
                return;
            }

            if (MapManager.Instance != null && MapManager.Instance.currentOperativeClearance >= requiredClearanceLevel)
            {
                isUnlocked = true;
                if (doorController != null) doorController.UnlockDoor();
                OpenDoorAndTransition();
            }
            else
            {
                Debug.Log($"[SectorDoorConnector] ACCESS DENIED: Requires Security Clearance Level {requiredClearanceLevel}.");
            }
        }

        private void OpenDoorAndTransition()
        {
            if (doorController != null)
            {
                doorController.OpenDoor();
            }

            if (MapManager.Instance != null)
            {
                MapManager.Instance.TransitionToSector(targetSectorId);
            }
        }
    }
}
