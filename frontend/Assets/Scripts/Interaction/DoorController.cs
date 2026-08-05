// DoorController.cs — BlackVault Phase 1
//
// Handles the visual/physical state of a security door: locked (closed,
// red light, blocks movement) vs unlocked (opens, green light, passable).
//
// Setup in Unity:
//   1. Attach to the door GameObject (or a parent containing the door
//      mesh + a BoxCollider used as a physical blocker).
//   2. Assign doorMesh (the moving part), and optionally a light/material
//      for the red/green indicator.
//   3. Leave startLocked = true for any door guarding a puzzle.

using System.Collections;
using UnityEngine;

public class DoorController : MonoBehaviour
{
    [Header("References")]
    public Transform doorMesh;         // the part that physically moves/slides open
    public Collider blockingCollider;  // disabled once unlocked, so the player can walk through
    public Light statusLight;          // optional — red while locked, green once unlocked
    public AudioSource audioSource;    // optional — plays unlock/open sounds

    [Header("Clips (optional)")]
    public AudioClip unlockSound;
    public AudioClip openSound;

    [Header("Animation Settings")]
    public Vector3 openOffset = new Vector3(0f, 3f, 0f); // how far the door slides when opening
    public float openDuration = 1.2f;

    [Header("State")]
    public bool startLocked = true;

    private bool _isUnlocked;
    private Vector3 _closedPosition;

    private void Start()
    {
        if (doorMesh != null) _closedPosition = doorMesh.localPosition;
        SetLockedVisual(startLocked);
    }

    /// <summary>
    /// Called by TerminalInteractable when the linked puzzle is solved.
    /// </summary>
    public void Unlock()
    {
        if (_isUnlocked) return;
        _isUnlocked = true;

        SetLockedVisual(false);

        if (audioSource != null && unlockSound != null)
        {
            audioSource.PlayOneShot(unlockSound);
        }

        StartCoroutine(OpenDoorAnimation());
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

        if (doorMesh == null) yield break;

        Vector3 targetPosition = _closedPosition + openOffset;
        float elapsed = 0f;

        while (elapsed < openDuration)
        {
            elapsed += Time.deltaTime;
            float t = Mathf.SmoothStep(0f, 1f, elapsed / openDuration);
            doorMesh.localPosition = Vector3.Lerp(_closedPosition, targetPosition, t);
            yield return null;
        }

        doorMesh.localPosition = targetPosition;
    }
}
