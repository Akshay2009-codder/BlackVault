using System.Collections;
using UnityEngine;

public class PhonePropController : MonoBehaviour
{
    [Header("Target Positions")]
    public Vector3 hiddenLocalPos = new Vector3(0.35f, -0.6f, 0.4f);
    public Vector3 raisedLocalPos = new Vector3(0.22f, -0.22f, 0.45f);
    public Vector3 hiddenLocalRot = new Vector3(45f, -30f, 0f);
    public Vector3 raisedLocalRot = new Vector3(-10f, -15f, 5f);
    public float animSpeed = 6f;

    [Header("Phone Model Materials")]
    public Color bodyColor = new Color(0.08f, 0.08f, 0.1f);
    public Color screenGlowColor = new Color(0f, 0.85f, 0.85f);

    private GameObject phoneObject;
    private Transform phoneTransform;
    private Coroutine motionRoutine;

    private void Start()
    {
        Build3DPhoneModel();

        if (MobileCallManager.Instance != null)
        {
            MobileCallManager.Instance.OnCallAnswered += OnCallAnswered;
            MobileCallManager.Instance.OnCallEnded += OnCallEnded;
        }

        // Initialize phone to hidden position
        if (phoneTransform != null)
        {
            phoneTransform.localPosition = hiddenLocalPos;
            phoneTransform.localEulerAngles = hiddenLocalRot;
        }
    }

    private void OnDestroy()
    {
        if (MobileCallManager.Instance != null)
        {
            MobileCallManager.Instance.OnCallAnswered -= OnCallAnswered;
            MobileCallManager.Instance.OnCallEnded -= OnCallEnded;
        }
    }

    private void Build3DPhoneModel()
    {
        phoneObject = new GameObject("3D_Smartphone_Prop");
        phoneObject.transform.SetParent(transform, false);
        phoneTransform = phoneObject.transform;

        // Body chassis
        GameObject body = GameObject.CreatePrimitive(PrimitiveType.Cube);
        body.name = "PhoneBody";
        body.transform.SetParent(phoneTransform, false);
        body.transform.localPosition = Vector3.zero;
        body.transform.localScale = new Vector3(0.08f, 0.16f, 0.01f);

        Material bodyMat = new Material(Shader.Find("Standard"));
        bodyMat.color = bodyColor;
        bodyMat.SetFloat("_Metallic", 0.8f);
        bodyMat.SetFloat("_Glossiness", 0.7f);
        body.GetComponent<Renderer>().material = bodyMat;
        Destroy(body.GetComponent<Collider>());

        // Screen display
        GameObject screen = GameObject.CreatePrimitive(PrimitiveType.Cube);
        screen.name = "PhoneScreen";
        screen.transform.SetParent(phoneTransform, false);
        screen.transform.localPosition = new Vector3(0f, 0f, -0.006f);
        screen.transform.localScale = new Vector3(0.072f, 0.145f, 0.002f);

        Material screenMat = new Material(Shader.Find("Standard"));
        screenMat.color = screenGlowColor;
        screenMat.EnableKeyword("_EMISSION");
        screenMat.SetColor("_EmissionColor", screenGlowColor * 1.5f);
        screen.GetComponent<Renderer>().material = screenMat;
        Destroy(screen.GetComponent<Collider>());
    }

    private void OnCallAnswered(MobileCallManager.PhoneCallData call)
    {
        MoveTo(raisedLocalPos, raisedLocalRot);
    }

    private void OnCallEnded(MobileCallManager.PhoneCallData call)
    {
        MoveTo(hiddenLocalPos, hiddenLocalRot);
    }

    private void MoveTo(Vector3 targetPos, Vector3 targetRot)
    {
        if (phoneTransform == null) return;
        if (motionRoutine != null) StopCoroutine(motionRoutine);
        motionRoutine = StartCoroutine(MotionRoutine(targetPos, Quaternion.Euler(targetRot)));
    }

    private IEnumerator MotionRoutine(Vector3 targetPos, Quaternion targetRot)
    {
        Vector3 startPos = phoneTransform.localPosition;
        Quaternion startRot = phoneTransform.localRotation;
        float t = 0f;

        while (t < 1f)
        {
            t += Time.deltaTime * animSpeed;
            phoneTransform.localPosition = Vector3.Lerp(startPos, targetPos, Mathf.SmoothStep(0f, 1f, t));
            phoneTransform.localRotation = Quaternion.Slerp(startRot, targetRot, Mathf.SmoothStep(0f, 1f, t));
            yield return null;
        }

        phoneTransform.localPosition = targetPos;
        phoneTransform.localRotation = targetRot;
        motionRoutine = null;
    }
}
