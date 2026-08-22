using UnityEngine;

[RequireComponent(typeof(Collider))]
public class HidingSpot : MonoBehaviour
{
    private void OnTriggerEnter(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            StealthController stealth = other.GetComponent<StealthController>();
            if (stealth != null)
            {
                stealth.SetHidden(true);
            }
        }
    }

    private void OnTriggerExit(Collider other)
    {
        if (other.CompareTag("Player"))
        {
            StealthController stealth = other.GetComponent<StealthController>();
            if (stealth != null)
            {
                stealth.SetHidden(false);
            }
        }
    }
}
