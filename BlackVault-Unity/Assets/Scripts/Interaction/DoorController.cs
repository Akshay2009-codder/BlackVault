// DoorController.cs — BlackVault Phase 1 (v2 — Lab Redesign)
//
// Handles the visual/physical state of a security door: locked (closed,
// red light, blocks movement) vs unlocked (opens, green light, passable).
//
// v2 additions:
//   - doorLabel: text label displayed on the door signage (e.g. "DATA INTAKE")
//   - chainedDoor: when THIS door unlocks, it also triggers the chained door
//   - frameAccentColor: colored trim on the door frame
//   - Double-door support: two panels slide apart (left + right)
//   - Auto-open mode: unlocks when the player enters a trigger zone
//
// Setup in Unity:
//   1. Attach to the door GameObject (or a parent containing the door
//      mesh + a BoxCollider used as a physical blocker).
//   2. Assign doorMesh (the moving part), and optionally a light/material
//      for the red/green indicator.
//   3. Leave startLocked = true for any door guarding a puzzle.
//   4. For double doors, assign doorMeshRight as well.

using System.Collections;
using UnityEngine;

public class DoorController : MonoBehaviour
{
    [Header("References")]
    public Transform doorMesh;         // the part that physically moves/slides open (left panel or single)
    public Transform doorMeshRight;    // optional — right panel for double-door
    public Collider blockingCollider;  // disabled once unlocked, so the player can walk through
    public Light statusLight;          // optional — red while locked, green once unlocked
    public AudioSource audioSource;    // optional — plays unlock/open sounds

    [Header("Clips (optional)")]
    public AudioClip unlockSound;
    public AudioClip openSound;

    [Header("Animation Settings")]
    public Vector3 openOffset = new Vector3(-1.5f, 0f, 0f); // how far left panel slides when opening
    public float openDuration = 1.2f;

    [Header("Door Identity")]
    [Tooltip("Label displayed above this door (e.g. DATA INTAKE, PROCESSING CORE).")]
    public string doorLabel = "";

    [Tooltip("Accent color for the door frame LED strips.")]
    public Color frameAccentColor = Color.cyan;

    [Header("Chaining")]
    [Tooltip("When this door unlocks, it will also unlock the chained door.")]
    public DoorController chainedDoor;

    [Header("Auto-Open")]
    [Tooltip("If true, the door auto-unlocks when the player enters the trigger zone.")]
    public bool autoOpen = false;

    [Header("State")]
    public bool startLocked = true;

    private bool _isUnlocked;
    private Vector3 _closedPosition;
    private Vector3 _closedPositionRight;

    private void Start()
    {
        if (doorMesh != null) _closedPosition = doorMesh.localPosition;
        if (doorMeshRight != null) _closedPositionRight = doorMeshRight.localPosition;
        SetLockedVisual(startLocked);
    }

    /// <summary>
    /// Called by TerminalInteractable or IDEController when the linked puzzle is solved.
    /// </summary>
    public void Unlock()
    {
        UnlockDoor(null);
    }

    public void UnlockDoor(string challengeId = null)
    {
        if (_isUnlocked) return;
        _isUnlocked = true;

        SetLockedVisual(false);

        if (audioSource != null && unlockSound != null)
        {
            audioSource.PlayOneShot(unlockSound);
        }

        StartCoroutine(OpenDoorAnimation());

        // Chain unlock
        if (chainedDoor != null)
        {
            // Slight delay so the chained door opens visibly after this one
            StartCoroutine(DelayedChainUnlock());
        }
    }

    /// <summary>
    /// Auto-open trigger: when the player walks into the trigger zone
    /// and autoOpen is true, the door unlocks automatically.
    /// </summary>
    private void OnTriggerEnter(Collider other)
    {
        if (!autoOpen) return;
        if (!other.CompareTag("Player")) return;
        UnlockDoor();
    }

    private IEnumerator DelayedChainUnlock()
    {
        yield return new WaitForSeconds(0.5f);
        chainedDoor.UnlockDoor();
    }

    private void SetLockedVisual(bool locked)
    {
        if (statusLight != null)
        {
            statusLight.color = locked ? Color.red : Color.green;
        }
    }

    private IEnumerator OpenDoorAnimation()
    {
        if (audioSource != null && openSound != null)
        {
            audioSource.PlayOneShot(openSound);
        }

        // Disable the physical blocker immediately so the player isn't
        // stuck waiting for the animation to finish before passing through.
        if (blockingCollider != null) blockingCollider.enabled = false;

        float elapsed = 0f;

        while (elapsed < openDuration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.SmoothStep(0f, 1f, elapsed / openDuration);

            // Left panel (or single panel)
            if (doorMesh != null)
            {
                Vector3 targetLeft = _closedPosition + openOffset;
                doorMesh.localPosition = Vector3.Lerp(_closedPosition, targetLeft, t);
            }

            // Right panel (double-door — slides opposite direction)
            if (doorMeshRight != null)
            {
                Vector3 oppositeOffset = new Vector3(-openOffset.x, openOffset.y, openOffset.z);
                Vector3 targetRight = _closedPositionRight + oppositeOffset;
                doorMeshRight.localPosition = Vector3.Lerp(_closedPositionRight, targetRight, t);
            }

            yield return null;
        }

        // Snap to final positions
        if (doorMesh != null)
            doorMesh.localPosition = _closedPosition + openOffset;
        if (doorMeshRight != null)
        {
            Vector3 oppositeOffset = new Vector3(-openOffset.x, openOffset.y, openOffset.z);
            doorMeshRight.localPosition = _closedPositionRight + oppositeOffset;
        }
    }

    /// <summary>
    /// Returns true if this door has been unlocked (useful for UI queries).
    /// </summary>
    public bool IsUnlocked => _isUnlocked;
}
