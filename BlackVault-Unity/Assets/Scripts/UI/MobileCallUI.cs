using System.Collections;
using UnityEngine;
using UnityEngine.UI;

public class MobileCallUI : MonoBehaviour
{
    [Header("UI Root & Container")]
    public RectTransform phoneCardContainer;
    public Image cardBackgroundImage;
    public Image headerAccentLine;

    [Header("Caller Info")]
    public Text callerNameText;
    public Text callerTitleText;
    public Image callerAvatarImage;
    public Text callStatusText;

    [Header("Dialogue Box")]
    public GameObject dialogueBoxArea;
    public Text dialogueSubtitleText;

    [Header("Control Buttons")]
    public Button answerButton;
    public Button declineButton;
    public Text answerPromptText;
    public Text declinePromptText;

    [Header("Audio Waveform Animation")]
    public RectTransform waveformContainer;
    public Image[] waveformBars;

    [Header("Animation Settings")]
    public Vector2 hiddenPosition = new Vector2(450f, 40f);
    public Vector2 visiblePosition = new Vector2(-40f, 40f);
    public float animSpeed = 8f;

    private Coroutine slideRoutine;
    private Coroutine callTimerRoutine;
    private float callDurationSeconds = 0f;

    private void Start()
    {
        if (MobileCallManager.Instance != null)
        {
            MobileCallManager.Instance.OnIncomingCall += HandleIncomingCall;
            MobileCallManager.Instance.OnCallAnswered += HandleCallAnswered;
            MobileCallManager.Instance.OnCallEnded += HandleCallEnded;
            MobileCallManager.Instance.OnDialogueLineChanged += HandleDialogueUpdated;
        }

        if (answerButton != null)
            answerButton.onClick.AddListener(() => MobileCallManager.Instance?.AnswerCall());

        if (declineButton != null)
            declineButton.onClick.AddListener(() => MobileCallManager.Instance?.DeclineCall());

        // Initialize to hidden state off-screen right
        if (phoneCardContainer != null)
            phoneCardContainer.anchoredPosition = hiddenPosition;

        if (dialogueBoxArea != null)
            dialogueBoxArea.SetActive(false);
    }

    private void OnDestroy()
    {
        if (MobileCallManager.Instance != null)
        {
            MobileCallManager.Instance.OnIncomingCall -= HandleIncomingCall;
            MobileCallManager.Instance.OnCallAnswered -= HandleCallAnswered;
            MobileCallManager.Instance.OnCallEnded -= HandleCallEnded;
            MobileCallManager.Instance.OnDialogueLineChanged -= HandleDialogueUpdated;
        }
    }

    private void Update()
    {
        // Animate waveform bars when call is active
        if (waveformBars != null && MobileCallManager.Instance != null &&
            MobileCallManager.Instance.CurrentState == MobileCallManager.CallState.ActiveCall)
        {
            for (int i = 0; i < waveformBars.Length; i++)
            {
                if (waveformBars[i] == null) continue;
                float height = Mathf.PingPong(Time.time * 6f + i * 1.5f, 18f) + 4f;
                waveformBars[i].rectTransform.sizeDelta = new Vector2(4f, height);
            }
        }
    }

    private void HandleIncomingCall(MobileCallManager.PhoneCallData call)
    {
        if (callerNameText != null) callerNameText.text = call.callerName;
        if (callerTitleText != null) callerTitleText.text = call.callerTitle;
        if (callStatusText != null) callStatusText.text = "INCOMING COMMS CALL...";

        if (headerAccentLine != null) headerAccentLine.color = call.callerThemeColor;

        if (answerPromptText != null) answerPromptText.text = "[T] Answer";
        if (declinePromptText != null) declinePromptText.text = "[Y] Ignore";

        if (dialogueBoxArea != null) dialogueBoxArea.SetActive(false);
        if (answerButton != null) answerButton.gameObject.SetActive(true);
        if (declineButton != null) declineButton.gameObject.SetActive(true);

        SlideTo(visiblePosition);
    }

    private void HandleCallAnswered(MobileCallManager.PhoneCallData call)
    {
        if (callStatusText != null) callStatusText.text = "COMMS ACTIVE — 00:00";
        if (answerPromptText != null) answerPromptText.text = "[T] Next";
        if (declinePromptText != null) declinePromptText.text = "[Y] End";

        if (dialogueBoxArea != null) dialogueBoxArea.SetActive(true);

        callDurationSeconds = 0f;
        if (callTimerRoutine != null) StopCoroutine(callTimerRoutine);
        callTimerRoutine = StartCoroutine(CallTimerRoutine());
    }

    private void HandleDialogueUpdated(string text)
    {
        if (dialogueSubtitleText != null)
        {
            dialogueSubtitleText.text = text;
        }
    }

    private void HandleCallEnded(MobileCallManager.PhoneCallData call)
    {
        if (callTimerRoutine != null)
        {
            StopCoroutine(callTimerRoutine);
            callTimerRoutine = null;
        }

        if (callStatusText != null) callStatusText.text = "CALL TERMINATED";

        SlideTo(hiddenPosition);
    }

    private void SlideTo(Vector2 targetPos)
    {
        if (phoneCardContainer == null) return;
        if (slideRoutine != null) StopCoroutine(slideRoutine);
        slideRoutine = StartCoroutine(SlideRoutine(targetPos));
    }

    private IEnumerator SlideRoutine(Vector2 targetPos)
    {
        Vector2 start = phoneCardContainer.anchoredPosition;
        float t = 0f;
        while (t < 1f)
        {
            t += Time.deltaTime * animSpeed;
            phoneCardContainer.anchoredPosition = Vector2.Lerp(start, targetPos, Mathf.SmoothStep(0f, 1f, t));
            yield return null;
        }
        phoneCardContainer.anchoredPosition = targetPos;
        slideRoutine = null;
    }

    private IEnumerator CallTimerRoutine()
    {
        while (MobileCallManager.Instance != null &&
               MobileCallManager.Instance.CurrentState == MobileCallManager.CallState.ActiveCall)
        {
            yield return new WaitForSeconds(1f);
            callDurationSeconds += 1f;
            int mins = (int)(callDurationSeconds / 60f);
            int secs = (int)(callDurationSeconds % 60f);
            if (callStatusText != null)
            {
                callStatusText.text = $"COMMS ACTIVE — {mins:D2}:{secs:D2}";
            }
        }
    }
}
