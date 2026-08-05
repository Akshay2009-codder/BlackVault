using UnityEngine;

namespace BlackVault.Player
{
    [RequireComponent(typeof(Rigidbody2D))]
    [RequireComponent(typeof(Animator))]
    public class PlayerController : MonoBehaviour
    {
        [Header("Movement Settings")]
        public float moveSpeed = 5f;

        private Rigidbody2D rb;
        private Animator animator;
        private Vector2 movement;
        private bool isInteracting = false;

        void Start()
        {
            rb = GetComponent<Rigidbody2D>();
            animator = GetComponent<Animator>();
            
            // Ensure no gravity for top-down 2D
            rb.gravityScale = 0f;
            // Prevent physics from rotating the sprite
            rb.constraints = RigidbodyConstraints2D.FreezeRotation; 
        }

        void Update()
        {
            if (isInteracting) 
            {
                movement = Vector2.zero;
                return; 
            }

            // Input reading
            movement.x = Input.GetAxisRaw("Horizontal");
            movement.y = Input.GetAxisRaw("Vertical");
            movement = movement.normalized;

            // Update Animator
            if (movement != Vector2.zero)
            {
                animator.SetFloat("Horizontal", movement.x);
                animator.SetFloat("Vertical", movement.y);
            }
            animator.SetFloat("Speed", movement.sqrMagnitude);
        }

        void FixedUpdate()
        {
            // Apply physical movement
            rb.MovePosition(rb.position + movement * moveSpeed * Time.fixedDeltaTime);
        }

        public void SetInteractingState(bool state)
        {
            isInteracting = state;
            animator.SetBool("IsTyping", state);
            
            if (state)
            {
                // Stop movement immediately
                movement = Vector2.zero;
                rb.velocity = Vector2.zero;
                animator.SetFloat("Speed", 0f);
            }
        }
    }
}
