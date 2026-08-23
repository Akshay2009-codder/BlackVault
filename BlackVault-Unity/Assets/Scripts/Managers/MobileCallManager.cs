using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MobileCallManager : MonoBehaviour
{
    public static MobileCallManager Instance { get; private set; }

    public enum CallState
    {
        Idle,
        Ringing,
        ActiveCall,
        Ending
    }

    [System.Serializable]
    public class PhoneCallData
    {
        public string callId;
        public string callerName = "Handler Vector";
        public string callerTitle = "BlackVault Tactical Lead";
        public Sprite callerAvatar;
        public Color callerThemeColor = new Color(0f, 0.85f, 0.85f);
        [TextArea(2, 5)]
        public string[] dialogueLines;
        public float typewriterSpeed = 0.03f;
        public bool autoAnswer = false;
        public bool ringDurationUnlimited = true;
        public float ringTimeoutSeconds = 15f;
    }

    [Header("Current State")]
    public CallState CurrentState { get; private set; } = CallState.Idle;
    public PhoneCallData CurrentCall { get; private set; }

    [Header("Input Keys")]
    public KeyCode answerKey = KeyCode.T;
    public KeyCode declineKey = KeyCode.Y;

    [Header("Audio Settings")]
    public AudioSource audioSource;
    public AudioClip ringtoneClip;
    public AudioClip callAnswerClip;
    public AudioClip callEndClip;
    public AudioClip typewriterBeepClip;

    // Events
    public event Action<PhoneCallData> OnIncomingCall;
    public event Action<PhoneCallData> OnCallAnswered;
    public event Action<PhoneCallData> OnCallEnded;
    public event Action<string> OnDialogueLineChanged;

    private Queue<PhoneCallData> callQueue = new Queue<PhoneCallData>();
    private Coroutine activeTypewriterRoutine;
    private Coroutine ringTimeoutRoutine;
    private int currentLineIndex = 0;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }
        Instance = this;

        if (audioSource == null)
        {
            audioSource = gameObject.AddComponent<AudioSource>();
            audioSource.playOnAwake = false;
        }
    }

    private void Update()
    {
        if (CurrentState == CallState.Ringing)
        {
            if (Input.GetKeyDown(answerKey) || (CurrentCall != null && CurrentCall.autoAnswer))
            {
                AnswerCall();
            }
            else if (Input.GetKeyDown(declineKey))
            {
                DeclineCall();
            }
        }
        else if (CurrentState == CallState.ActiveCall)
        {
            if (Input.GetKeyDown(answerKey))
            {
                AdvanceDialogueOrEnd();
            }
            else if (Input.GetKeyDown(declineKey))
            {
                EndCall();
            }
        }
    }

    public void TriggerIncomingCall(PhoneCallData call)
    {
        if (call == null) return;

        if (CurrentState != CallState.Idle)
        {
            callQueue.Enqueue(call);
            return;
        }

        StartIncomingCall(call);
    }

    private void StartIncomingCall(PhoneCallData call)
    {
        CurrentCall = call;
        CurrentState = CallState.Ringing;
        currentLineIndex = 0;

        if (audioSource != null && ringtoneClip != null)
        {
            audioSource.clip = ringtoneClip;
            audioSource.loop = true;
            audioSource.Play();
        }

        if (!call.ringDurationUnlimited && call.ringTimeoutSeconds > 0)
        {
            ringTimeoutRoutine = StartCoroutine(RingTimeoutTimer(call.ringTimeoutSeconds));
        }

        OnIncomingCall?.Invoke(call);
        Debug.Log($"[BlackVault Comms] Incoming call from {call.callerName} ({call.callerTitle})");
    }

    public void AnswerCall()
    {
        if (CurrentState != CallState.Ringing || CurrentCall == null) return;

        if (ringTimeoutRoutine != null)
        {
            StopCoroutine(ringTimeoutRoutine);
            ringTimeoutRoutine = null;
        }

        CurrentState = CallState.ActiveCall;

        if (audioSource != null)
        {
            audioSource.Stop();
            if (callAnswerClip != null) audioSource.PlayOneShot(callAnswerClip);
        }

        OnCallAnswered?.Invoke(CurrentCall);
        Debug.Log($"[BlackVault Comms] Answered call from {CurrentCall.callerName}");

        PlayNextDialogueLine();
    }

    public void DeclineCall()
    {
        if (CurrentState != CallState.Ringing) return;
        EndCall();
    }

    public void AdvanceDialogueOrEnd()
    {
        if (CurrentState != CallState.ActiveCall || CurrentCall == null) return;

        if (activeTypewriterRoutine != null)
        {
            // Finish current line immediately if currently typing
            StopCoroutine(activeTypewriterRoutine);
            activeTypewriterRoutine = null;
            if (currentLineIndex < CurrentCall.dialogueLines.Length)
            {
                OnDialogueLineChanged?.Invoke(CurrentCall.dialogueLines[currentLineIndex]);
                currentLineIndex++;
            }
            return;
        }

        if (currentLineIndex < CurrentCall.dialogueLines.Length)
        {
            PlayNextDialogueLine();
        }
        else
        {
            EndCall();
        }
    }

    private void PlayNextDialogueLine()
    {
        if (CurrentCall == null || currentLineIndex >= CurrentCall.dialogueLines.Length)
        {
            EndCall();
            return;
        }

        string line = CurrentCall.dialogueLines[currentLineIndex];
        activeTypewriterRoutine = StartCoroutine(TypewriterRoutine(line));
    }

    private IEnumerator TypewriterRoutine(string fullLine)
    {
        string currentText = "";
        float delay = CurrentCall != null ? CurrentCall.typewriterSpeed : 0.03f;

        for (int i = 0; i < fullLine.Length; i++)
        {
            currentText += fullLine[i];
            OnDialogueLineChanged?.Invoke(currentText);

            if (audioSource != null && typewriterBeepClip != null && i % 3 == 0)
            {
                audioSource.PlayOneShot(typewriterBeepClip, 0.2f);
            }

            yield return new WaitForSeconds(delay);
        }

        currentLineIndex++;
        activeTypewriterRoutine = null;
    }

    public void EndCall()
    {
        if (CurrentState == CallState.Idle) return;

        if (activeTypewriterRoutine != null)
        {
            StopCoroutine(activeTypewriterRoutine);
            activeTypewriterRoutine = null;
        }

        if (ringTimeoutRoutine != null)
        {
            StopCoroutine(ringTimeoutRoutine);
            ringTimeoutRoutine = null;
        }

        CurrentState = CallState.Ending;

        if (audioSource != null)
        {
            audioSource.Stop();
            if (callEndClip != null) audioSource.PlayOneShot(callEndClip);
        }

        PhoneCallData finishedCall = CurrentCall;
        CurrentCall = null;
        CurrentState = CallState.Idle;

        OnCallEnded?.Invoke(finishedCall);
        Debug.Log("[BlackVault Comms] Call ended.");

        // Process queued calls if any
        if (callQueue.Count > 0)
        {
            StartCoroutine(StartNextQueuedCallWithDelay(1.5f));
        }
    }

    private IEnumerator RingTimeoutTimer(float seconds)
    {
        yield return new WaitForSeconds(seconds);
        if (CurrentState == CallState.Ringing)
        {
            DeclineCall();
        }
    }

    private IEnumerator StartNextQueuedCallWithDelay(float delay)
    {
        yield return new WaitForSeconds(delay);
        if (callQueue.Count > 0 && CurrentState == CallState.Idle)
        {
            StartIncomingCall(callQueue.Dequeue());
        }
    }
}
