using UnityEngine;

[RequireComponent(typeof(BoxCollider))]
public class CallTriggerZone : MonoBehaviour
{
    [Header("Call Content")]
    public string callId = "Call_Story_1";
    public string callerName = "Handler Vector";
    public string callerTitle = "BlackVault Comms Lead";
    public Color themeColor = new Color(0f, 0.85f, 0.85f);

    [TextArea(2, 5)]
    public string[] dialogueLines = new string[]
    {
        "Operative, do you copy? This is Handler Vector.",
        "Security firewalls are blocking the main doors in this sector.",
        "Find the security terminal, clean the dirty raw dataset, and train the model to override the lock!"
    };

    public bool playOnceOnly = true;

    private bool triggered = false;

    private void Start()
    {
        BoxCollider box = GetComponent<BoxCollider>();
        if (box != null)
        {
            box.isTrigger = true;
        }
    }

    private void OnTriggerEnter(Collider other)
    {
        if (triggered && playOnceOnly) return;

        if (other.CompareTag("Player"))
        {
            triggered = true;

            MobileCallManager.PhoneCallData call = new MobileCallManager.PhoneCallData
            {
                callId = callId,
                callerName = callerName,
                callerTitle = callerTitle,
                callerThemeColor = themeColor,
                dialogueLines = dialogueLines,
                typewriterSpeed = 0.025f,
                ringDurationUnlimited = true
            };

            if (MobileCallManager.Instance != null)
            {
                MobileCallManager.Instance.TriggerIncomingCall(call);
                Debug.Log($"[BlackVault Comms] Triggered call '{callId}' from zone '{gameObject.name}'");
            }
        }
    }
}
