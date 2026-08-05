// TerminalInteractable.cs — BlackVault
//
// Attach to a security terminal object in the level. Uses a trigger
// collider to detect when the player is nearby, shows a "Press E to
// interact" prompt, and opens the ML Puzzle UI on interact.
//
// Setup in Unity:
//   1. Add a Collider to the terminal object, check "Is Trigger".
//   2. Attach this script to the terminal object.
//   3. Assign the "Press E" prompt (a world-space or screen-space
//      TextMeshProUGUI) in the Inspector — keep it disabled by default.
//   4. Assign the MLPuzzleUI reference (drag the Canvas/UI object that
//      has MLPuzzleUI.cs on it).
//   5. Set `level` to match a level in main.py's MISSION_POOL (1-5).
//      NOTE: dataset id is no longer set here — MLPuzzleUI fetches the
//      full mission config (including dataset) from GET /mission/generate
//      itself, so this script only needs to know the level number.
//   6. Tag the player GameObject "Player" (or change the tag check below).

using UnityEngine;

[RequireComponent(typeof(Collider))]
public class TerminalInteractable : MonoBehaviour
{
    [Header("Mission Config")]
    [Tooltip("Level number — used to call /mission/generate?level=N. Must match a level in main.py's MISSION_POOL.")]
    public int level = 1;

    [Header("References")]
    public GameObject interactPrompt; // simple "Press E" UI element, world-space or screen-space
    public MLPuzzleUI mlPuzzleUI;     // the ML Puzzle panel controller (see MLPuzzleUI.cs)
    public DoorController linkedDoor; // the door this terminal controls

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

        // Hand control to the ML Puzzle UI. It will fetch the mission
        // config itself (dataset, target column, allowed algorithms),
        // call the backend, and call back into OnPuzzleResult() when
        // the player submits.
        mlPuzzleUI.Open(level, OnPuzzleResult);
    }

    /// <summary>
    /// Called by MLPuzzleUI once the backend returns a result for /train.
    /// </summary>
    private void OnPuzzleResult(bool doorUnlocked)
    {
        if (doorUnlocked)
        {
            _puzzleSolved = true;
            if (linkedDoor != null) linkedDoor.Unlock();
        }
        else
        {
            // Failed attempt — player stays locked out, prompt reappears
            // if they're still in range so they can try again.
            if (_playerInRange && interactPrompt != null)
            {
                interactPrompt.SetActive(true);
            }
        }
    }
}
