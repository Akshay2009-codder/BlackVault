// TeamCardView.cs — BlackVault Phase 2
//
// Attach this to your TeamCard prefab (used by MissionBriefingUI).
// Just fills in the visuals for one roster member — no logic beyond that.
//
// Prefab structure expected:
//   TeamCard (this script + CanvasGroup)
//     - Image "PortraitImage"   (optional, can leave unassigned)
//     - TMP_Text "NameText"
//     - TMP_Text "RoleText"
//     - Image "AccentBar"       (optional — tinted with member's color)

using BlackVault.Managers;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class TeamCardView : MonoBehaviour
{
    public Image portraitImage;
    public TMP_Text nameText;
    public TMP_Text roleText;
    public Image accentBar;

    public void Set(TeamMemberData member)
    {
        if (nameText != null) nameText.text = member.callsign;
        if (roleText != null) roleText.text = member.role;

        if (portraitImage != null)
        {
            if (member.portrait != null)
            {
                portraitImage.sprite = member.portrait;
            }
            else
            {
                // no portrait asset assigned — just tint a plain square instead,
                // so this works before you've imported any character art
                portraitImage.color = member.tintColor;
            }
        }

        if (accentBar != null) accentBar.color = member.tintColor;
        if (nameText != null) nameText.color = member.tintColor;
    }
}