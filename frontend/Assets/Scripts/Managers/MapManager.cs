// MapManager.cs — Central Facility Map Controller Singleton for Unity
using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Networking;
using UnityEngine.SceneManagement;

namespace BlackVault.Map
{
    public class MapManager : MonoBehaviour
    {
        public static MapManager Instance { get; private set; }

        [Header("Facility Configuration")]
        public string currentSectorId = "SEC_01";
        public int currentOperativeClearance = 1;
        public string backendUrl = "http://localhost:8000";

        [Header("Loaded Sectors Catalog")]
        public List<LevelMapData> sectorDataList = new List<LevelMapData>();

        public event Action<string> OnSectorChanged;
        public event Action<string> OnDoorUnlocked;

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void Start()
        {
            StartCoroutine(SyncFacilityMapFromBackend());
        }

        public IEnumerator SyncFacilityMapFromBackend()
        {
            string url = $"{backendUrl}/map/facility";
            using (UnityWebRequest www = UnityWebRequest.Get(url))
            {
                yield return www.SendWebRequest();
                if (www.result == UnityWebRequest.Result.Success)
                {
                    Debug.Log($"[MapManager] Synced facility map state: {www.downloadHandler.text}");
                }
                else
                {
                    Debug.LogWarning($"[MapManager] Failed backend map sync: {www.error}. Operating offline.");
                }
            }
        }

        public void UnlockDoor(string doorId)
        {
            StartCoroutine(PostUnlockDoor(doorId));
        }

        private IEnumerator PostUnlockDoor(string doorId)
        {
            string url = $"{backendUrl}/map/unlock?door_id={doorId}";
            using (UnityWebRequest www = UnityWebRequest.PostWwwForm(url, ""))
            {
                yield return www.SendWebRequest();
                if (www.result == UnityWebRequest.Result.Success)
                {
                    Debug.Log($"[MapManager] Door {doorId} unlocked successfully on server.");
                    OnDoorUnlocked?.Invoke(doorId);
                }
            }
        }

        public void TransitionToSector(string sectorId)
        {
            currentSectorId = sectorId;
            OnSectorChanged?.Invoke(sectorId);
            Debug.Log($"[MapManager] Player transitioned to sector {sectorId}");
        }
    }
}
