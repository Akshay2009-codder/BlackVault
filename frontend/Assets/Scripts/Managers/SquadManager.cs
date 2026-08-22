// SquadManager.cs — BlackVault Phase 2: Mission Briefing & Squad Radio
//
// Persistent singleton (same pattern as GameManager) holding your team
// roster and broadcasting radio chatter events. Decoupled on purpose:
// this script knows nothing about UI — it just fires a static C# event.
// RadioChatterUI (in each gameplay scene) subscribes to hear it, and
// MissionBriefingUI reads the roster to render team cards.
//
// STORY FIT: your team extracted successfully; you're trapped alone.
// So "team" here means remote support — they're not physically beside
// you, they're on comms while doing their own thing outside. That's why
// BroadcastRadioMessage doesn't require anyone else to be in the scene.
//
// SETUP IN UNITY:
//   1. Create an empty GameObject named "SquadManager" in your FIRST
//      loaded scene (e.g. a persistent "Bootstrap" scene, or just
//      00_ApiTest / the Hub — wherever your game boots from).
//   2. Attach this script.
//   3. Fill in the "Roster" array in the Inspector with your team's
//      names/roles (or leave empty — DefaultRoster() fills sensible
//      placeholders automatically so this works with zero setup).
//   4. DontDestroyOnLoad keeps it alive across every level scene.

using System;
using System.Collections.Generic;
using UnityEngine;

namespace BlackVault.Managers
{
    [Serializable]
    public class TeamMemberData
    {
        public string callsign;          // "VEX", "NYX", "GHOST"
        public string role;              // "Systems / Overwatch", "Infiltration", "Extraction Driver"
        public Sprite portrait;          // optional — leave null to use a colored placeholder
        public Color tintColor = Color.cyan;

        [Tooltip("Flavor lines this member can radio in after ANY door unlocks. " +
                 "Use {level} as a placeholder for the sector number.")]
        public string[] radioLines;
    }

    public readonly struct RadioMessage
    {
        public readonly string Speaker;
        public readonly string Text;
        public readonly Color Tint;

        public RadioMessage(string speaker, string text, Color tint)
        {
            Speaker = speaker;
            Text = text;
            Tint = tint;
        }
    }

    public class SquadManager : MonoBehaviour
    {
        public static SquadManager Instance { get; private set; }

        [Header("Team Roster")]
        [Tooltip("Leave empty to auto-fill with default BlackVault crew names.")]
        public List<TeamMemberData> roster = new List<TeamMemberData>();

        /// <summary>Fired whenever a teammate radios in. RadioChatterUI listens for this.</summary>
        public static event Action<RadioMessage> OnRadioMessage;

        private System.Random _rng = new System.Random();

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                if (roster == null || roster.Count == 0) roster = DefaultRoster();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private static List<TeamMemberData> DefaultRoster()
        {
            return new List<TeamMemberData>
            {
                new TeamMemberData
                {
                    callsign = "VEX",
                    role = "Systems / Overwatch",
                    tintColor = new Color(0.24f, 1f, 0.63f), // green
                    radioLines = new[]
                    {
                        "Nice work on sector {level}. I'm feeding you a few more seconds on the next alarm cycle.",
                        "Sector {level} lock's down. Camera loop is holding — keep moving.",
                        "That's one more door than the AI expected you to survive. Keep going.",
                    }
                },
                new TeamMemberData
                {
                    callsign = "NYX",
                    role = "Infiltration",
                    tintColor = new Color(0.31f, 0.82f, 0.91f), // cyan
                    radioLines = new[]
                    {
                        "Copy that, sector {level} clear. I'm working the maintenance shaft topside, stand by.",
                        "Good breach. Whatever you did in there rattled the whole grid up here.",
                    }
                },
                new TeamMemberData
                {
                    callsign = "GHOST",
                    role = "Extraction Driver",
                    tintColor = new Color(1f, 0.71f, 0.15f), // amber
                    radioLines = new[]
                    {
                        "Engine's warm whenever you get here. Sector {level} down — you're making good time.",
                        "I'll circle the east ridge until you're out. Keep clearing rooms.",
                    }
                },
            };
        }

        /// <summary>
        /// Call this from TerminalInteractable (or DoorController) right after
        /// a door unlocks. Picks a random teammate + random flavor line for them.
        /// </summary>
        public void NotifyDoorUnlocked(int level)
        {
            if (roster == null || roster.Count == 0) return;

            TeamMemberData speaker = roster[_rng.Next(roster.Count)];
            if (speaker.radioLines == null || speaker.radioLines.Length == 0) return;

            string line = speaker.radioLines[_rng.Next(speaker.radioLines.Length)]
                .Replace("{level}", level.ToString());

            Broadcast(speaker.callsign, line, speaker.tintColor);
        }

        /// <summary>Fire a one-off custom message (e.g. mission intro, boss room, scripted beats).</summary>
        public void Broadcast(string speakerCallsign, string text, Color tint)
        {
            OnRadioMessage?.Invoke(new RadioMessage(speakerCallsign, text, tint));
        }
    }
}