// FacilityRoverVehicle3D.cs — 3D Autonomous Patrol Rover Vehicle Controller for Unity
using System.Collections.Generic;
using UnityEngine;

namespace BlackVault.Interaction
{
    public class FacilityRoverVehicle3D : MonoBehaviour
    {
        [Header("Vehicle Specs")]
        public string vehicleCallsign = "ROVER-SECTOR-PATROL";
        public float moveSpeed = 6.0f;
        public float turnSpeed = 4.0f;
        public Color vehicleNeonColor = Color.yellow;

        [Header("Lighting Components")]
        public Light headlightLeft;
        public Light headlightRight;
        public Light sirenBeaconLight;
        public Renderer vehicleBodyRenderer;

        [Header("Patrol Waypoints")]
        public List<Transform> patrolWaypoints = new List<Transform>();
        private int currentWaypointIndex = 0;

        private void Start()
        {
            ApplyVehicleColor();
        }

        private void Update()
        {
            // Flash siren light
            if (sirenBeaconLight != null)
            {
                sirenBeaconLight.intensity = 2.0f + Mathf.PingPong(Time.time * 4.0f, 3.0f);
            }

            // Patrol movement
            if (patrolWaypoints != null && patrolWaypoints.Count > 0)
            {
                Transform targetWp = patrolWaypoints[currentWaypointIndex];
                if (targetWp != null)
                {
                    Vector3 dir = (targetWp.position - transform.position).normalized;
                    dir.y = 0;

                    if (dir != Vector3.zero)
                    {
                        Quaternion targetRot = Quaternion.LookRotation(dir);
                        transform.rotation = Quaternion.Slerp(transform.rotation, targetRot, turnSpeed * Time.deltaTime);
                    }

                    transform.position += transform.forward * moveSpeed * Time.deltaTime;

                    if (Vector3.Distance(transform.position, targetWp.position) < 1.5f)
                    {
                        currentWaypointIndex = (currentWaypointIndex + 1) % patrolWaypoints.Count;
                    }
                }
            }
        }

        public void ApplyVehicleColor()
        {
            if (headlightLeft != null) headlightLeft.color = vehicleNeonColor;
            if (headlightRight != null) headlightRight.color = vehicleNeonColor;
            if (sirenBeaconLight != null) sirenBeaconLight.color = vehicleNeonColor;

            if (vehicleBodyRenderer != null && vehicleBodyRenderer.material != null)
            {
                vehicleBodyRenderer.material.color = vehicleNeonColor;
            }
        }
    }
}
