// PlayerController.cs — BlackVault Phase 1

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
    public float jumpHeight = 1.2f;
    public float gravity = -18f;
    public float mouseSensitivity = 2.2f;

    [Header("Third-Person Camera Settings")]
    public float thirdPersonDistance = 4f;
    public float thirdPersonHeight = 2f;
    public float thirdPersonMinPitch = -20f;
    public float thirdPersonMaxPitch = 60f;

    [Header("Toggle")]
    public KeyCode switchCameraKey = KeyCode.V;
    public bool startInFirstPerson = true;

    private CharacterController _controller;
    private Vector3 _velocity;
    private float _pitch;
    private float _yaw;
    private bool _isFirstPerson;

    public bool inputEnabled = true;

    private void Start()
    {
        _controller = GetComponent<CharacterController>();
        _isFirstPerson = startInFirstPerson;
        ApplyCameraMode();

        Cursor.lockState = CursorLockMode.Locked;
        Cursor.visible = false;
    }

    private void Update()
    {
        if (!inputEnabled)
        {
            return;
        }

        HandleCameraToggle();
        HandleLook();
        HandleMovement();
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
        bool isRunning = Input.GetKey(KeyCode.LeftShift);

        Vector3 move = transform.right * horizontal + transform.forward * vertical;
        float speed = isRunning ? runSpeed : walkSpeed;
        _controller.Move(move * speed * Time.deltaTime);

        if (Input.GetButtonDown("Jump") && isGrounded)
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
}
