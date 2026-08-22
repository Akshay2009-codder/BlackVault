// MissionIntroSequence.cs — BlackVault Phase 2
//
// Drop this on an empty GameObject in whichever scene should open with
// the phone-call + briefing sequence (e.g. 01_Level1_DataCleaning, or
// a dedicated intro scene before it). Player input is locked until the
// player clicks "Start Mission".
//
// SETUP IN UNITY:
//   1. Empty GameObject "MissionIntro" in the scene.
//   2. Attach this script.
//   3. Drag in: phoneCallUI, missionBriefingUI (both from Phase 2 files),
//      and the scene's PlayerController.
//   4. Fill in callerName / missionTitle / objective per-scene (e.g. for
//      Level 3 you'd write a different objective than Level 1).
//   5. If SquadManager doesn't exist yet in the scene/session, this script
//      creates one automatically so nothing breaks if you forget to add it.

using BlackVault.Managers;
using UnityEngine;

public class MissionIntroSequence : MonoBehaviour
{
    [Header("References")]
    public PhoneCallUI phoneCallUI;
    public MissionBriefingUI missionBriefingUI;
    public PlayerController player;

    [Header("Content — customize per scene")]
    public string callerName = "UNKNOWN — INCOMING SIGNAL";
    public string missionTitle = "SECTOR 01 — DATA CLEANING";
    [TextArea(2, 4)]
    public string objective =
        "The extraction team is clear. You're not. Every corridor door out of this facility " +
        "is locked behind a security model. Vex is feeding you a data feed now — clean it, " +
        "train it, and get that first door open.";

    [Header("Behavior")]
    public bool lockPlayerUntilStart = true;

    private void Start()
    {
        EnsureSquadManagerExists();

        if (lockPlayerUntilStart && player != null)
        {
            player.SetInputEnabled(false);
        }

        if (phoneCallUI != null)
        {
            phoneCallUI.RingAndAnswer(callerName, OnCallAnswered);
        }
        else
        {
            // No phone call UI wired up — skip straight to briefing.
            OnCallAnswered();
        }
    }

    private void OnCallAnswered()
    {
        if (missionBriefingUI != null && SquadManager.Instance != null)
        {
            missionBriefingUI.Open(missionTitle, objective, SquadManager.Instance.roster, OnBriefingComplete);
        }
        else
        {
            OnBriefingComplete();
        }
    }

    private void OnBriefingComplete()
    {
        if (player != null) player.SetInputEnabled(true);

        // Optional flavor: first radio check-in right as gameplay starts.
        if (SquadManager.Instance != null)
        {
            SquadManager.Instance.Broadcast(
                "VEX",
                "You're live. Terminal near you should be pulling the first dataset now.",
                new Color(0.24f, 1f, 0.63f)
            );
        }
    }

    private void EnsureSquadManagerExists()
    {
        if (SquadManager.Instance != null) return;
        var go = new GameObject("SquadManager");
        go.AddComponent<SquadManager>();
    }
}