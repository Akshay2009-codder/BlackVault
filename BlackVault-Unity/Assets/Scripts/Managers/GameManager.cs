using UnityEngine;

namespace BlackVault.Managers
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        public bool IsGamePaused { get; private set; } = false;

        void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        void Update()
        {
            if (Input.GetKeyDown(KeyCode.Escape))
            {
                TogglePause();
            }
        }

        public void TogglePause()
        {
            IsGamePaused = !IsGamePaused;
            Time.timeScale = IsGamePaused ? 0f : 1f;

            if (IsGamePaused)
            {
                Cursor.lockState = CursorLockMode.None;
                Cursor.visible = true;
                // TODO: Show Pause Menu UI
                Debug.Log("Game Paused");
            }
            else
            {
                Cursor.lockState = CursorLockMode.Locked;
                Cursor.visible = false;
                // TODO: Hide Pause Menu UI
                Debug.Log("Game Resumed");
            }
        }
    }
}
