using UnityEngine;
using TMPro;
using BlackVault.Networking;
using System.Text.RegularExpressions;

namespace BlackVault.UI
{
    public class IDEController : MonoBehaviour
    {
        [Header("UI Elements")]
        public GameObject idePanel;
        public TMP_InputField codeInputField;
        public TextMeshProUGUI consoleOutputText;
        
        [Header("References")]
        public PlayerController playerController;
        public DoorController associatedDoor;

        private string currentChallengeId;
        private TerminalType currentTerminalType;

        void Start()
        {
            if (idePanel != null) idePanel.SetActive(false);
            if (consoleOutputText != null) consoleOutputText.text = "System Ready...";
        }

        public void OpenIDE(string challengeId, TerminalType terminalType)
        {
            currentChallengeId = challengeId;
            currentTerminalType = terminalType;
            if (idePanel != null) idePanel.SetActive(true);
            
            if (consoleOutputText != null) consoleOutputText.text = "Awaiting execution...";
            
            if (codeInputField != null)
            {
                if (terminalType == TerminalType.Preprocess)
                {
                    codeInputField.text = $"# Target Dataset: house_prices\n# Write Python script to clean data\n\ndataset = \"house_prices\"\nmissing_strategy = \"fill_mean\"\n\n# execute\npreprocess()";
                }
                else if (terminalType == TerminalType.Train)
                {
                    codeInputField.text = $"# Target Dataset: house_prices\n# Train a model to predict prices\n\ndataset = \"house_prices\"\nproblem_type = \"regression\"\nalgorithm = \"random_forest\"\ntarget_col = \"price\"\n\n# execute\ntrain_model()";
                }
                else if (terminalType == TerminalType.Corrupt)
                {
                    codeInputField.text = $"# OVERRIDE TERMINAL\n# Inject anomalies into the database\n\ndataset = \"house_prices\"\nevent_type = \"inject_missing\"\ntarget_col = \"price\"\n\n# execute\ncorrupt_data()";
                }
                
                codeInputField.Select();
                codeInputField.ActivateInputField();
            }
        }

        public void CloseIDE()
        {
            if (idePanel != null) idePanel.SetActive(false);
            
            if (playerController != null)
            {
                playerController.SetInteractingState(false);
                Cursor.lockState = CursorLockMode.Locked;
                Cursor.visible = false;
            }
        }

        public void SubmitCode()
        {
            string playerCode = codeInputField != null ? codeInputField.text : "";
            LogToConsole("Submitting code to remote server...");

            if (ApiClient.Instance == null)
            {
                LogToConsole("ERROR: ApiClient not found in scene!", true);
                return;
            }

            if (currentTerminalType == TerminalType.Preprocess)
            {
                HandlePreprocessSubmit(playerCode);
            }
            else if (currentTerminalType == TerminalType.Train)
            {
                HandleTrainSubmit(playerCode);
            }
            else if (currentTerminalType == TerminalType.Corrupt)
            {
                HandleCorruptSubmit(playerCode);
            }
        }
        
        private void HandlePreprocessSubmit(string code)
        {
            PreprocessRequest req = new PreprocessRequest();
            
            Match datasetMatch = Regex.Match(code, @"dataset\s*=\s*""([^""]+)""");
            if (datasetMatch.Success) req.dataset = datasetMatch.Groups[1].Value;

            Match missingMatch = Regex.Match(code, @"missing_strategy\s*=\s*""([^""]+)""");
            if (missingMatch.Success) req.missing_strategy = missingMatch.Groups[1].Value;

            ApiClient.Instance.SendPreprocessRequest(req, 
                (res) => {
                    LogToConsole($"SUCCESS: Cleaned dataset {res.dataset}\nRows: {res.rows_after} (removed {res.duplicates_removed} dups)\nMissing remaining: {res.missing_after}");
                    UnlockDoorIfApplicable();
                },
                (err) => LogToConsole($"API ERROR: {err}", true)
            );
        }

        private void HandleTrainSubmit(string code)
        {
            TrainRequest req = new TrainRequest();
            
            Match datasetMatch = Regex.Match(code, @"dataset\s*=\s*""([^""]+)""");
            if (datasetMatch.Success) req.dataset = datasetMatch.Groups[1].Value;

            Match probMatch = Regex.Match(code, @"problem_type\s*=\s*""([^""]+)""");
            if (probMatch.Success) req.problem_type = probMatch.Groups[1].Value;

            Match algMatch = Regex.Match(code, @"algorithm\s*=\s*""([^""]+)""");
            if (algMatch.Success) req.algorithm = algMatch.Groups[1].Value;
            
            Match targetMatch = Regex.Match(code, @"target_col\s*=\s*""([^""]+)""");
            if (targetMatch.Success) req.target_col = targetMatch.Groups[1].Value;

            ApiClient.Instance.SendTrainRequest(req, 
                (res) => {
                    if (res.passed)
                    {
                        LogToConsole($"SUCCESS\nMetric ({res.target_metric}): {res.achieved}\nTarget was: {res.target_value}\nXP Earned: {res.xp_earned}");
                        UnlockDoorIfApplicable();
                    }
                    else
                    {
                        LogToConsole($"FAILED\nMetric ({res.target_metric}): {res.achieved}\nTarget was: {res.target_value}\nModel is not accurate enough.", true);
                    }
                },
                (err) => LogToConsole($"API ERROR: {err}", true)
            );
        }

        private void HandleCorruptSubmit(string code)
        {
            CorruptRequest req = new CorruptRequest();
            
            Match datasetMatch = Regex.Match(code, @"dataset\s*=\s*""([^""]+)""");
            if (datasetMatch.Success) req.dataset = datasetMatch.Groups[1].Value;

            Match eventMatch = Regex.Match(code, @"event_type\s*=\s*""([^""]+)""");
            if (eventMatch.Success) req.event_type = eventMatch.Groups[1].Value;

            ApiClient.Instance.SendCorruptRequest(req, 
                (res) => {
                    LogToConsole($"OVERRIDE SUCCESS\nDataset: {res.dataset}\nInjected: {res.event_type}\nStatus: {res.status}");
                    UnlockDoorIfApplicable();
                },
                (err) => LogToConsole($"API ERROR: {err}", true)
            );
        }

        private void UnlockDoorIfApplicable()
        {
            if (associatedDoor != null)
            {
                associatedDoor.UnlockDoor(currentChallengeId);
            }
            
            PlayerHUD hud = FindAnyObjectByType<PlayerHUD>();
            if (hud != null)
            {
                hud.RefreshHUD();
            }
        }

        private void LogToConsole(string message, bool isError = false)
        {
            Debug.Log(message);
            if (consoleOutputText != null)
            {
                string colorHex = isError ? "#FF0000" : "#00FF00";
                consoleOutputText.text = $"<color={colorHex}>{message}</color>";
            }
        }
    }
}
