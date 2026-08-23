// PlayerController.cs — BlackVault Phase 2 (Enhanced with Crouching & Call Answering Mechanics)

using UnityEngine;

[RequireComponent(typeof(CharacterController))]
public class PlayerController : MonoBehaviour
{
    [Header("Camera References")]
    public Camera firstPersonCamera;
    public Camera thirdPersonCamera;
    public Transform thirdPersonLookTarget;
    public GameObject playerModel;

    [Header("Movement Settings")]
    public float walkSpeed = 4.5f;
    public float runSpeed = 7.5f;
    public float crouchSpeed = 2.2f;
    public float callWalkSpeed = 3.0f;
    public float jumpHeight = 1.2f;
    public float gravity = -18f;
    public float mouseSensitivity = 2.2f;

    [Header("Crouch Settings")]
    public KeyCode crouchKey = KeyCode.C;
    public KeyCode crouchKeyAlt = KeyCode.LeftControl;
    public float standingCameraHeight = 1.6f;
    public float crouchingCameraHeight = 0.9f;
    public float crouchTransitionSpeed = 8f;

    [Header("Third-Person Camera Settings")]
    public float thirdPersonDistance = 4f;
    public float thirdPersonHeight = 2f;
    public float thirdPersonMinPitch = -20f;
    public float thirdPersonMaxPitch = 60f;

    [Header("Toggle")]
    public KeyCode switchCameraKey = KeyCode.V;
    public bool startInFirstPerson = true;

    private CharacterController _controller;
    private StealthController _stealth;
    private Vector3 _velocity;
    private float _pitch;
    private float _yaw;
    private bool _isFirstPerson;
    private bool _isCrouching = false;
    private bool _isAnsweringCall = false;
    private float _currentCamHeight;

    public bool inputEnabled = true;
    public bool IsCrouching => _isCrouching;
    public bool IsAnsweringCall => _isAnsweringCall;

    private void Start()
    {
        _controller = GetComponent<CharacterController>();
        _stealth = GetComponent<StealthController>();
        _isFirstPerson = startInFirstPerson;
        _currentCamHeight = standingCameraHeight;
        ApplyCameraMode();

        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;

        if (MobileCallManager.Instance != null)
        {
            MobileCallManager.Instance.OnCallAnswered += HandleCallAnswered;
            MobileCallManager.Instance.OnCallEnded += HandleCallEnded;
        }
    }

    private void OnDestroy()
    {
        if (MobileCallManager.Instance != null)
        {
            MobileCallManager.Instance.OnCallAnswered -= HandleCallAnswered;
            MobileCallManager.Instance.OnCallEnded -= HandleCallEnded;
        }
    }

    private void Update()
    {
        if (!inputEnabled)
        {
            return;
        }

        HandleCameraToggle();
        HandleCrouch();
        HandleLook();
        HandleMovement();
    }

    private void HandleCallAnswered(MobileCallManager.PhoneCallData call)
    {
        _isAnsweringCall = true;
    }

    private void HandleCallEnded(MobileCallManager.PhoneCallData call)
    {
        _isAnsweringCall = false;
    }

    private void HandleCameraToggle()
    {
        if (Input.GetKeyDown(switchCameraKey))
        {
            _isFirstPerson = !_isFirstPerson;
            ApplyCameraMode();
        }
    }

    private void ApplyCameraMode()
    {
        if (firstPersonCamera != null) firstPersonCamera.gameObject.SetActive(_isFirstPerson);
        if (thirdPersonCamera != null) thirdPersonCamera.gameObject.SetActive(!_isFirstPerson);
        if (playerModel != null) playerModel.SetActive(!_isFirstPerson);
    }

    private void HandleCrouch()
    {
        if (Input.GetKeyDown(crouchKey) || Input.GetKeyDown(crouchKeyAlt))
        {
            _isCrouching = !_isCrouching;
            if (_stealth != null)
            {
                if (_isCrouching) _stealth.EnterHidingSpot();
                else _stealth.ExitHidingSpot();
            }
        }

        float targetHeight = _isCrouching ? crouchingCameraHeight : standingCameraHeight;
        _currentCamHeight = Mathf.Lerp(_currentCamHeight, targetHeight, Time.deltaTime * crouchTransitionSpeed);

        if (firstPersonCamera != null)
        {
            Vector3 camPos = firstPersonCamera.transform.localPosition;
            camPos.y = _currentCamHeight;
            firstPersonCamera.transform.localPosition = camPos;
        }

        if (_controller != null)
        {
            _controller.height = _isCrouching ? 1.0f : 1.8f;
            _controller.center = new Vector3(0f, _controller.height / 2f, 0f);
        }
    }

    private void HandleLook()
    {
        float mouseX = Input.GetAxis("Mouse X") * mouseSensitivity;
        float mouseY = Input.GetAxis("Mouse Y") * mouseSensitivity;

        _yaw += mouseX;
        _pitch -= mouseY;

        if (_isFirstPerson)
        {
            _pitch = Mathf.Clamp(_pitch, -85f, 85f);
            transform.rotation = Quaternion.Euler(0f, _yaw, 0f);
            if (firstPersonCamera != null)
                firstPersonCamera.transform.localRotation = Quaternion.Euler(_pitch, 0f, 0f);
        }
        else
        {
            _pitch = Mathf.Clamp(_pitch, thirdPersonMinPitch, thirdPersonMaxPitch);
            transform.rotation = Quaternion.Euler(0f, _yaw, 0f);

            if (thirdPersonCamera != null && thirdPersonLookTarget != null)
            {
                Quaternion rotation = Quaternion.Euler(_pitch, _yaw, 0f);
                Vector3 desiredPosition = thirdPersonLookTarget.position
                                           - (rotation * Vector3.forward * thirdPersonDistance)
                                           + Vector3.up * thirdPersonHeight * 0.25f;
                thirdPersonCamera.transform.position = desiredPosition;
                thirdPersonCamera.transform.LookAt(thirdPersonLookTarget.position + Vector3.up * 0.5f);
            }
        }
    }

    private void HandleMovement()
    {
        bool isGrounded = _controller.isGrounded;
        if (isGrounded && _velocity.y < 0)
        {
            _velocity.y = -2f;
        }

        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");
        bool isRunning = Input.GetKey(KeyCode.LeftShift) && !_isCrouching && !_isAnsweringCall;

        Vector3 move = transform.right * horizontal + transform.forward * vertical;

        float speed = walkSpeed;
        if (_isCrouching) speed = crouchSpeed;
        else if (_isAnsweringCall) speed = callWalkSpeed;
        else if (isRunning) speed = runSpeed;

        _controller.Move(move * speed * Time.deltaTime);

        if (Input.GetButtonDown("Jump") && isGrounded && !_isCrouching)
        {
            _velocity.y = Mathf.Sqrt(jumpHeight * -2f * gravity);
        }

        _velocity.y += gravity * Time.deltaTime;
        _controller.Move(_velocity * Time.deltaTime);
    }

    public void SetInputEnabled(bool enabled)
    {
        inputEnabled = enabled;
        Cursor.lockState = enabled ? CursorLockMode.Locked : CursorLockMode.None;
        Cursor.visible = !enabled;
    }

    public void SetInteractingState(bool interacting)
    {
        SetInputEnabled(!interacting);
    }
}
