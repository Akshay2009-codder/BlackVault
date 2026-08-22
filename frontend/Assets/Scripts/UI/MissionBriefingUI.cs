// MissionBriefingUI.cs — BlackVault Phase 2
//
// GTA heist-planning-board style screen: objective text typed out,
// team roster cards fading in one by one, then "START MISSION" unlocks
// player control and hands off to gameplay.
//
// SETUP IN UNITY:
//   1. Build Canvas_Briefing (Screen Space - Overlay), left inactive by default.
//   2. Child elements:
//        - TMP_Text "MissionTitleText"
//        - TMP_Text "ObjectiveText"      (typewriter target)
//        - Transform "RosterContainer"    (Horizontal Layout Group)
//        - A "TeamCard" prefab: Image background + TMP_Text name + TMP_Text role
//          (assign this prefab to teamCardPrefab below)
//        - Button "StartMissionButton" (hidden/disabled until roster finishes)
//   3. Attach this script, wire references + teamCardPrefab.
//   4. Call missionBriefingUI.Open(title, objective, roster, onStart) from
//      MissionIntroSequence.cs.

using System.Collections;
using System.Collections.Generic;
using BlackVault.Managers;
using TMPro;
using UnityEngine;
using UnityEngine.UI;

public class MissionBriefingUI : MonoBehaviour
{
    [Header("References")]
    public TMP_Text missionTitleText;
    public TMP_Text objectiveText;
    public Transform rosterContainer;
    public GameObject teamCardPrefab;   // must have TeamCardView component (below)
    public Button startMissionButton;

    [Header("Timing")]
    public float typewriterSpeed = 0.015f;
    public float cardStaggerDelay = 0.25f;

    private System.Action _onStart;
    private readonly List<GameObject> _spawnedCards = new List<GameObject>();

    private void Awake()
    {
        gameObject.SetActive(false);
        if (startMissionButton != null)
        {
            startMissionButton.onClick.AddListener(OnStartClicked);
            startMissionButton.gameObject.SetActive(false);
        }
    }

    public void Open(string missionTitle, string objective, List<TeamMemberData> roster, System.Action onStart)
    {
        _onStart = onStart;
        gameObject.SetActive(true);

        foreach (var card in _spawnedCards) Destroy(card);
        _spawnedCards.Clear();

        if (missionTitleText != null) missionTitleText.text = missionTitle;
        if (objectiveText != null) objectiveText.text = "";
        if (startMissionButton != null) startMissionButton.gameObject.SetActive(false);

        StartCoroutine(PlayBriefingSequence(objective, roster));
    }

    private IEnumerator PlayBriefingSequence(string objective, List<TeamMemberData> roster)
    {
        // 1. Type out the objective
        if (objectiveText != null)
        {
            foreach (char c in objective)
            {
                objectiveText.text += c;
                yield return new WaitForSecondsRealtime(typewriterSpeed);
            }
        }

        yield return new WaitForSecondsRealtime(0.3f);

        // 2. Spawn team cards one at a time
        if (roster != null && rosterContainer != null && teamCardPrefab != null)
        {
            foreach (var member in roster)
            {
                GameObject cardObj = Instantiate(teamCardPrefab, rosterContainer);
                _spawnedCards.Add(cardObj);

                var view = cardObj.GetComponent<TeamCardView>();
                if (view != null) view.Set(member);

                // simple fade-in
                var cg = cardObj.GetComponent<CanvasGroup>();
                if (cg == null) cg = cardObj.AddComponent<CanvasGroup>();
                cg.alpha = 0f;
                StartCoroutine(FadeIn(cg, 0.4f));

                yield return new WaitForSecondsRealtime(cardStaggerDelay);
            }
        }

        yield return new WaitForSecondsRealtime(0.2f);

        // 3. Reveal Start button
        if (startMissionButton != null) startMissionButton.gameObject.SetActive(true);
    }

    private IEnumerator FadeIn(CanvasGroup cg, float duration)
    {
        float t = 0f;
        while (t < duration)
        {
            t += Time.unscaledDeltaTime;
            cg.alpha = Mathf.Clamp01(t / duration);
            yield return null;
        }
        cg.alpha = 1f;
    }

    private void OnStartClicked()
    {
        gameObject.SetActive(false);
        _onStart?.Invoke();
    }
}