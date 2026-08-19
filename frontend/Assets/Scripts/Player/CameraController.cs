using UnityEngine;

namespace BlackVault.Player
{
    public class CameraController : MonoBehaviour
    {
        public Transform target; // The player
        
        [Header("Follow Settings")]
        public float smoothSpeed = 5f;
        public Vector3 offset = new Vector3(0f, 0f, -10f); // Standard camera offset

        void LateUpdate()
        {
            if (target == null) return;

            Vector3 desiredPosition = new Vector3(target.position.x, target.position.y, target.position.z) + offset;
            Vector3 smoothedPosition = Vector3.Lerp(transform.position, desiredPosition, smoothSpeed * Time.deltaTime);
            
            transform.position = smoothedPosition;
        }
    }
}
