// WaypointPathRenderer.cs — Floor Laser Navigation Guide Renderer
using System.Collections.Generic;
using UnityEngine;

namespace BlackVault.Player
{
    [RequireComponent(typeof(LineRenderer))]
    public class WaypointPathRenderer : MonoBehaviour
    {
        [Header("Waypoints & Line Settings")]
        public Transform playerTransform;
        public List<Transform> activeWaypoints = new List<Transform>();
        public float floorOffset = 0.15f;
        public float textureScrollSpeed = 2.0f;

        private LineRenderer lineRenderer;
        private Material lineMaterial;

        private void Awake()
        {
            lineRenderer = GetComponent<LineRenderer>();
            lineRenderer.positionCount = 0;
            if (lineRenderer.material != null)
            {
                lineMaterial = lineRenderer.material;
            }
        }

        private void Update()
        {
            if (activeWaypoints == null || activeWaypoints.Count == 0 || playerTransform == null)
            {
                lineRenderer.positionCount = 0;
                return;
            }

            lineRenderer.positionCount = activeWaypoints.Count + 1;
            Vector3 startPos = playerTransform.position;
            startPos.y += floorOffset;
            lineRenderer.SetPosition(0, startPos);

            for (int i = 0; i < activeWaypoints.Count; i++)
            {
                if (activeWaypoints[i] != null)
                {
                    Vector3 wpPos = activeWaypoints[i].position;
                    wpPos.y += floorOffset;
                    lineRenderer.SetPosition(i + 1, wpPos);
                }
            }

            // Animate laser pulse flow texture
            if (lineMaterial != null)
            {
                float offset = Time.time * textureScrollSpeed;
                lineMaterial.SetTextureOffset("_MainTex", new Vector2(-offset, 0));
            }
        }

        public void SetTargetDestination(Transform destination)
        {
            activeWaypoints.Clear();
            if (destination != null)
            {
                activeWaypoints.Add(destination);
            }
        }
    }
}
