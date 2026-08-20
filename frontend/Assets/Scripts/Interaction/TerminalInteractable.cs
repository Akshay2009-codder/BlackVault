using UnityEngine;

public enum TerminalType
{
    Preprocess,
    Train,
    Corrupt
}

[RequireComponent(typeof(Collider))]
public class TerminalInteractable : MonoBehaviour
{
    [Header("Mission Config")]
    public int level = 1;

    [Header("References")]
    public GameObject interactPrompt;
    public MLPuzzleUI mlPuzzleUI;
    public DoorController linkedDoor;

    [Tooltip("Optional — the 'incoming transmission' screen shown after this " +
             "terminal's puzzle is solved. Wired automatically by " +
             "BlackVault > Add Mission Complete Overlay To This Scene.")]
    public MissionCompleteOverlay missionCompleteOverlay;

    [Header("Debug / Deadline Safety Net")]
    [Tooltip("TEMPORARY: when true, pressing E unlocks the door immediately, " +
             "skipping the ML puzzle panel entirely.")]
    public bool debugSkipPuzzle = false;

    [Header("Input")]
    public KeyCode interactKey = KeyCode.E;

    private bool _playerInRange;
    private bool _puzzleSolved;

    private void Start()
    {
        if (interactPrompt != null) interactPrompt.SetActive(false);
    }

    private void Update()
    {
        if (_playerInRange && !_puzzleSolved && Input.GetKeyDown(interactKey))
        {
            OpenTerminal();
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        if (!other.CompareTag("Player")) return;

        _playerInRange = true;
        if (!_puzzleSolved && interactPrompt != null)
        {
            interactPrompt.SetActive(true);
        }
    }

    private void OnTriggerExit(Collider other)
    {
        if (!other.CompareTag("Player")) return;

        _playerInRange = false;
        if (interactPrompt != null) interactPrompt.SetActive(false);
    }

    private void OpenTerminal()
    {
        if (interactPrompt != null) interactPrompt.SetActive(false);

        if (debugSkipPuzzle)
        {
            Debug.Log($"[BlackVault] debugSkipPuzzle is ON — unlocking {name} without opening the puzzle panel.");
            _puzzleSolved = true;
            if (linkedDoor != null) linkedDoor.Unlock();
            return;
        }

        mlPuzzleUI.Open(level, OnPuzzleResult);
    }

    private void OnPuzzleResult(bool doorUnlocked)
    {
        if (doorUnlocked)
        {
            _puzzleSolved = true;
            if (linkedDoor != null) linkedDoor.Unlock();

            if (missionCompleteOverlay != null)
            {
                missionCompleteOverlay.Show(
                    level,
                    $"Incoming transmission... Sector {level} secured. Proceed to the next checkpoint."
                );
            }
        }
        else
        {
            if (_playerInRange && interactPrompt != null)
            {
                interactPrompt.SetActive(true);
            }
        }
    }
}