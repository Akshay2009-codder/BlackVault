// FullGameBuilder.cs — BlackVault
//
// Sets up File > Build Settings' scene list programmatically (Hub
// first, then Levels 1-5 — deliberately excludes BossRoom and ApiTest,
// since neither is fully backed/tested), then triggers a standalone
// Windows build to a folder you pick.
//
// Usage: BlackVault > Build Full Game (EXE)
// You'll be asked to pick an output folder — choose one OUTSIDE
// OneDrive (e.g. C:\BlackVault_Submission\Game).

using System.Collections.Generic;
using System.IO;
using UnityEditor;
using UnityEngine;

public static class FullGameBuilder
{
    // ADJUST these paths if your actual scene file names differ slightly —
    // the build will tell you exactly which one is missing if so.
    private static readonly string[] ScenePaths = new[]
    {
        "Assets/Scenes/00_MissionHub.unity",
        "Assets/Scenes/01_Level1_DataCleaning.unity",
        "Assets/Scenes/02_Level2_Regression.unity",
        "Assets/Scenes/03_Level3_Classification.unity",
        "Assets/Scenes/04_Level4_Clustering.unity",
        "Assets/Scenes/05_Level5_Anomaly.unity",
    };

    [MenuItem("BlackVault/Build Full Game (EXE)")]
    public static void BuildFullGame()
    {
        // Verify every scene actually exists BEFORE touching Build Settings
        // or starting a (slow) build — fail fast with a clear message.
        foreach (var path in ScenePaths)
        {
            if (!File.Exists(path))
            {
                Debug.LogError($"[BlackVault] Missing scene: {path}. Aborting — " +
                                "open your Scenes folder, check the exact file name, " +
                                "and update ScenePaths in FullGameBuilder.cs if it differs.");
                return;
            }
        }

        // Set the scene list — Hub first (index 0), so it's what loads on launch.
        var buildScenes = new List<EditorBuildSettingsScene>();
        foreach (var path in ScenePaths)
        {
            buildScenes.Add(new EditorBuildSettingsScene(path, true));
        }
        EditorBuildSettings.scenes = buildScenes.ToArray();
        Debug.Log($"[BlackVault] Build Settings scene list updated — {buildScenes.Count} scenes.");

        string outputFolder = EditorUtility.SaveFolderPanel(
            "Choose an OUTPUT FOLDER OUTSIDE OneDrive (e.g. C:\\BlackVault_Submission\\Game)",
            "", "");

        if (string.IsNullOrEmpty(outputFolder))
        {
            Debug.LogWarning("[BlackVault] Build cancelled — no folder selected.");
            return;
        }

        string exePath = Path.Combine(outputFolder, "BlackVault.exe");

        BuildPlayerOptions options = new BuildPlayerOptions
        {
            scenes = ScenePaths,
            locationPathName = exePath,
            target = BuildTarget.StandaloneWindows64,
            options = BuildOptions.None,
        };

        var report = BuildPipeline.BuildPlayer(options);

        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log($"[BlackVault] BUILD SUCCEEDED — {report.summary.totalSize} bytes. " +
                      $"Output: {exePath}");
        }
        else
        {
            Debug.LogError($"[BlackVault] BUILD FAILED — result: {report.summary.result}. " +
                            "Check the errors logged above this one for the actual cause.");
        }
    }
}
