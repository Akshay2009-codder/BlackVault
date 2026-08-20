// AddOverlayToAllLevels.cs — BlackVault Editor Tool
//
// Batch utility: opens each of the 5 level scenes one by one, adds the
// MissionCompleteOverlay via MissionCompleteOverlayBuilder, saves, and
// moves to the next.
//
// Usage:
//   Menu: BlackVault > Add Mission Complete Overlay To ALL Level Scenes
//   (saves each scene automatically)

using UnityEditor;
using UnityEditor.SceneManagement;

public static class AddOverlayToAllLevels
{
    private static readonly string[] LevelScenePaths = new string[]
    {
        "Assets/Scenes/01_Level1_DataCleaning.unity",
        "Assets/Scenes/02_Level2_Regression.unity",
        "Assets/Scenes/03_Level3_Classification.unity",
        "Assets/Scenes/04_Level4_Clustering.unity",
        "Assets/Scenes/05_Level5_Anomaly.unity",
    };

    [MenuItem("BlackVault/Add Mission Complete Overlay To ALL Level Scenes")]
    public static void AddOverlayToAll()
    {
        // Prompt to save the current scene first
        if (!EditorSceneManager.SaveCurrentModifiedScenesIfUserWantsTo())
        {
            UnityEngine.Debug.Log("[BlackVault] Cancelled by user.");
            return;
        }

        int successCount = 0;

        foreach (string scenePath in LevelScenePaths)
        {
            if (!System.IO.File.Exists(scenePath))
            {
                UnityEngine.Debug.LogWarning($"[BlackVault] Scene not found: {scenePath} — skipping.");
                continue;
            }

            // Open the scene
            EditorSceneManager.OpenScene(scenePath, OpenSceneMode.Single);

            // Run the overlay builder on it
            MissionCompleteOverlayBuilder.BuildOverlay();

            // Save
            EditorSceneManager.SaveOpenScenes();
            successCount++;

            UnityEngine.Debug.Log($"[BlackVault] ✔ Overlay added and saved: {scenePath}");
        }

        UnityEngine.Debug.Log($"[BlackVault] Done. Added overlay to {successCount}/{LevelScenePaths.Length} scenes.");
    }
}
