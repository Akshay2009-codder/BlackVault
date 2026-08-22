using UnityEngine;

public class StealthController : MonoBehaviour
{
    private int hidingLayerCount = 0;

    /// <summary>
    /// True when the player is inside at least one hiding spot.
    /// Uses a counter so overlapping hiding zones work correctly.
    /// </summary>
    public bool IsHidden
    {
        get { return hidingLayerCount > 0; }
    }

    /// <summary>
    /// Called by HidingSpot triggers when the player enters/exits.
    /// </summary>
    public void EnterHidingSpot()
    {
        hidingLayerCount++;
        Debug.Log($"[BlackVault] Player entered hiding spot. (Layers: {hidingLayerCount})");
    }

    public void ExitHidingSpot()
    {
        hidingLayerCount = Mathf.Max(0, hidingLayerCount - 1);
        Debug.Log($"[BlackVault] Player exited hiding spot. (Layers: {hidingLayerCount})");
    }

    // Legacy API — kept for backwards compatibility
    public void SetHidden(bool state)
    {
        if (state) EnterHidingSpot();
        else ExitHidingSpot();
    }
}
