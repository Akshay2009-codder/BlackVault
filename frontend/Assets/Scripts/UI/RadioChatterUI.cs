// RadioChatterUI.cs — BlackVault Phase 2
//
// Listens for SquadManager.OnRadioMessage and shows GTA-style radio
// toasts in a corner of the HUD (speaker callsign + message, auto-fades).
// Queues messages so they don't overlap if two arrive close together.
//
// SETUP IN UNITY:
//   1. Add to your gameplay HUD Canvas (same canvas as PlayerHUD),
//      corner of choice (bottom-left works well, mirrors GTA's placement).
//   2. Child: a panel with CanvasGroup + TMP_Text "SpeakerText" +
//      TMP_Text "MessageText". Leave the panel inactive by default.
//   3. Attach this script, wire references. That's it — no manual
//      triggering needed, it reacts to SquadManager automatically.

using System.Collections;
using System.Collections.Generic;
using BlackVault.Managers;
using TMPro;
using UnityEngine;

public class RadioChatterUI : MonoBehaviour
{
    [Header("References")]
    public GameObject toastPanel;
    public CanvasGroup toastCanvasGroup;
    public TMP_Text speakerText;
    public TMP_Text messageText;

    [Header("Timing")]
    public float displayDuration = 4.5f;
    public float fadeDuration = 0.4f;

    private readonly Queue<RadioMessage> _queue = new Queue<RadioMessage>();
    private bool _isShowing;

    private void OnEnable()
    {
        SquadManager.OnRadioMessage += HandleRadioMessage;
        if (toastPanel != null) toastPanel.SetActive(false);
    }

    private void OnDisable()
    {
        SquadManager.OnRadioMessage -= HandleRadioMessage;
    }

    private void HandleRadioMessage(RadioMessage msg)
    {
        _queue.Enqueue(msg);
        if (!_isShowing) StartCoroutine(ProcessQueue());
    }

    private IEnumerator ProcessQueue()
    {
        _isShowing = true;

        while (_queue.Count > 0)
        {
            RadioMessage msg = _queue.Dequeue();
            yield return ShowToast(msg);
        }

        _isShowing = false;
    }

    private IEnumerator ShowToast(RadioMessage msg)
    {
        if (speakerText != null)
        {
            speakerText.text = $"RADIO — {msg.Speaker}";
            speakerText.color = msg.Tint;
        }
        if (messageText != null) messageText.text = msg.Text;

        if (toastPanel != null) toastPanel.SetActive(true);
        if (toastCanvasGroup != null) yield return Fade(toastCanvasGroup, 0f, 1f, fadeDuration);

        yield return new WaitForSeconds(displayDuration);

        if (toastCanvasGroup != null) yield return Fade(toastCanvasGroup, 1f, 0f, fadeDuration);
        if (toastPanel != null) toastPanel.SetActive(false);
    }

    private IEnumerator Fade(CanvasGroup cg, float from, float to, float duration)
    {
        float t = 0f;
        cg.alpha = from;
        while (t < duration)
        {
            t += Time.deltaTime;
            cg.alpha = Mathf.Lerp(from, to, t / duration);
            yield return null;
        }
        cg.alpha = to;
    }
}