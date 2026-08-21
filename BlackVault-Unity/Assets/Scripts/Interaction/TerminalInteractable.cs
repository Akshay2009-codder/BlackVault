// TerminalInteractable.cs — BlackVault (v2 — Lab Redesign)
//
// Attach to a security terminal object in the level. Uses a trigger
// collider to detect when the player is nearby, shows a "Press E to
// interact" prompt, and opens the ML Puzzle UI on interact.
//
// v2: Added secondaryDoor — when the puzzle is solved, both the
// primary linkedDoor AND the secondaryDoor get unlocked (used for
// the exit door in the multi-room layout).

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

    [Header("Secondary Door (Exit)")]
    [Tooltip("Optional secondary door that also unlocks when the puzzle is solved " +
             "(typically the exit/egress door in the multi-room layout).")]
    public DoorController secondaryDoor;

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
            if (secondaryDoor != null) secondaryDoor.Unlock();
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
            if (secondaryDoor != null) secondaryDoor.Unlock();
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