using UnityEngine;

namespace BlackVault.Player
{
    public class CameraController : MonoBehaviour
    {
        public Transform target; // The player
        
        [Header("Follow Settings")]
        public float smoothSpeed = 5f;
        public Vector3 offset = new Vector3(0f, 0f, -10f); // Standard 2D camera Z offset

        void LateUpdate()
        {
            if (target == null) return;

            // Desired position is player's X/Y with the camera's Z offset
            Vector3 desiredPosition = new Vector3(target.position.x, target.position.y, target.position.z) + offset;
            
            // Smoothly move the camera towards that position
            Vector3 smoothedPosition = Vector3.Lerp(transform.position, desiredPosition, smoothSpeed * Time.deltaTime);
            
            transform.position = smoothedPosition;
        }
    }
}
