// PhoneCallUI.cs — BlackVault Phase 2
//
// GTA Online-style incoming call screen. Shows a pulsing caller card;
// "Decline" doesn't actually skip anything (mission calls in GTA can't
// be ignored) — it just shakes the panel and re-rings, same joke GTA
// plays on the player.
//
// SETUP IN UNITY:
//   1. Build Canvas_PhoneCall (Screen Space - Overlay, high sort order
//      so it renders above gameplay HUD).
//   2. Child panel "CallPanel" with:
//        - Image "CallerPortrait" (or leave null for a plain colored circle)
//        - TMP_Text "CallerNameText"
//        - TMP_Text "CallStatusText" ("Incoming call...")
//        - Button "AnswerButton", Button "DeclineButton"
//   3. Attach this script to Canvas_PhoneCall, wire the references,
//      leave the whole Canvas GameObject INACTIVE in the scene by default.
//   4. Call phoneCallUI.RingAndAnswer(callerName, onAnswered) from
//      MissionIntroSequence.cs (below) to trigger it.

using System.Collections;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class PhoneCallUI : MonoBehaviour
{
    [Header("References")]
    public GameObject callPanel;
    public Image callerPortrait;          // optional
    public TMP_Text callerNameText;
    public TMP_Text callStatusText;
    public Button answerButton;
    public Button declineButton;

    [Header("Feel")]
    public float ringPulseSpeed = 3f;
    public float ringPulseScale = 0.06f;
    public AudioSource audioSource;       // optional
    public AudioClip ringtone;

    private System.Action _onAnswered;
    private Coroutine _ringCoroutine;
    private Vector3 _panelBaseScale;

    private void Awake()
    {
        gameObject.SetActive(false);
        if (answerButton != null) answerButton.onClick.AddListener(OnAnswerClicked);
        if (declineButton != null) declineButton.onClick.AddListener(OnDeclineClicked);
        if (callPanel != null) _panelBaseScale = callPanel.transform.localScale;
    }

    /// <summary>Starts the ringing sequence. onAnswered fires once the player accepts.</summary>
    public void RingAndAnswer(string callerName, System.Action onAnswered)
    {
        _onAnswered = onAnswered;
        gameObject.SetActive(true);

        if (callerNameText != null) callerNameText.text = callerName;
        if (callStatusText != null) callStatusText.text = "Incoming transmission...";

        if (audioSource != null && ringtone != null)
        {
            audioSource.clip = ringtone;
            audioSource.loop = true;
            audioSource.Play();
        }

        if (_ringCoroutine != null) StopCoroutine(_ringCoroutine);
        _ringCoroutine = StartCoroutine(PulseRoutine());
    }

    private IEnumerator PulseRoutine()
    {
        float t = 0f;
        while (gameObject.activeSelf)
        {
            t += Time.unscaledDeltaTime * ringPulseSpeed;
            float scale = 1f + Mathf.Sin(t) * ringPulseScale;
            if (callPanel != null)
                callPanel.transform.localScale = _panelBaseScale * scale;
            yield return null;
        }
    }

    private void OnAnswerClicked()
    {
        StopRinging();
        gameObject.SetActive(false);
        _onAnswered?.Invoke();
    }

    private void OnDeclineClicked()
    {
        // Can't actually decline — same beat GTA uses on mission calls.
        StartCoroutine(RejectShake());
    }

    private IEnumerator RejectShake()
    {
        if (callStatusText != null) callStatusText.text = "You need to take this.";

        if (callPanel != null)
        {
            Vector3 basePos = callPanel.transform.localPosition;
            float t = 0f;
            while (t < 0.35f)
            {
                t += Time.unscaledDeltaTime;
                float x = Mathf.Sin(t * 40f) * 8f;
                callPanel.transform.localPosition = basePos + new Vector3(x, 0f, 0f);
                yield return null;
            }
            callPanel.transform.localPosition = basePos;
        }
    }

    private void StopRinging()
    {
        if (_ringCoroutine != null) StopCoroutine(_ringCoroutine);
        if (audioSource != null) audioSource.Stop();
        if (callPanel != null) callPanel.transform.localScale = _panelBaseScale;
    }
}