// PlayerController.cs — BlackVault Phase 1
//
// A CharacterController-based movement script that supports BOTH
// first-person and third-person camera modes, switchable at runtime
// by the player (default key: V). Movement logic is shared between
// both modes — only the camera rig and look behavior differ.
//
// Setup in Unity:
//   1. Create a Capsule (or your player model) — this is the player body.
//   2. Add a CharacterController component to it.
//   3. Attach this script to the same object.
//   4. Create TWO child empty GameObjects under the player:
//        - "FirstPersonCameraRig" positioned at head height (e.g. y=1.6)
//        - "ThirdPersonCameraRig" positioned behind/above (e.g. z=-4, y=2)
//   5. Create a Camera as a child of EACH rig, both disabled by default
//      except the one matching startInFirstPerson.
//   6. Drag the two Camera components into the fields below in the Inspector.

using UnityEngine;

[RequireComponent(typeof(CharacterController))]
public class PlayerController : MonoBehaviour
{
    [Header("Camera References")]
    [Tooltip("Camera used in first-person mode (child of FirstPersonCameraRig)")]
    public Camera firstPersonCamera;

    [Tooltip("Camera used in third-person mode (child of ThirdPersonCameraRig)")]
    public Camera thirdPersonCamera;

    [Tooltip("The pivot the third-person camera orbits around (usually the player's head)")]
    public Transform thirdPersonLookTarget;

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
    private float _pitch; // up/down look angle
    private float _yaw;   // left/right look angle (used for first-person; body rotation for third-person)
    private bool _isFirstPerson;

    // Set to false while the ML Puzzle UI (or any menu) is open,
    // so the player doesn't move the camera/character underneath it.
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
            return; // frozen while a UI panel (e.g. ML Puzzle) has focus
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
            // Body still turns with yaw so movement direction feels correct;
            // camera orbits around the body using pitch + fixed distance.
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
            _velocity.y = -2f; // small downward force to keep grounded flag stable
        }

        float horizontal = Input.GetAxis("Horizontal");
        float vertical = Input.GetAxis("Vertical");
        bool isRunning = Input.GetKey(KeyCode.LeftShift);

        // Movement is always relative to the player body's forward direction,
        // which is correct for both camera modes since the body rotates with yaw.
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

    /// <summary>
    /// Call this from the ML Puzzle UI when it opens/closes, so the
    /// player can't walk around or spin the camera while typing/clicking
    /// in the puzzle panel. Also unlocks the cursor for UI interaction.
    /// </summary>
    public void SetInputEnabled(bool enabled)
    {
        inputEnabled = enabled;
        Cursor.lockState = enabled ? CursorLockMode.Locked : CursorLockMode.None;
        Cursor.visible = !enabled;
    }
}