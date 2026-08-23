// LevelBuilder.cs — BlackVault Editor Tool (v3 — Full Mega-Lab)
//
// Builds ALL 5 mission labs into ONE connected scene:
//
//   [Level 1] → [Level 2] → [Level 3] → [Level 4] → [Level 5]
//
// Each level section has:
//   Entry Corridor → Ante-Chamber [D1] → Main Lab [D2] → Exit Chamber [D3]
//
// The exit chamber of Level N connects to the entry corridor of Level N+1.
// D1 is auto-open, D2 is puzzle-locked, D3 chains from D2.
//
// Usage:
//   1. File → New Scene → Empty
//   2. BlackVault → Build Complete Facility (All Levels)
//   3. Save as one scene
//   4. Hit Play — walk through all 5 labs!

using UnityEditor;
using UnityEngine;
using UnityEngine.UI;

public static class LevelBuilder
{
    // =====================================================================
    // Level Theme Configuration
    // =====================================================================

    private struct LevelTheme
    {
        public int level;
        public string sceneName;
        public string zoneName;
        public Color accentColor;
        public Color ambientColor;
        public Color fogColor;
        public string doorLabel1;
        public string doorLabel2;
        public string doorLabel3;
        public Color wallTint;
        public Color floorTint;
    }

    private static readonly LevelTheme[] Themes = new[]
    {
        new LevelTheme
        {
            level = 1, sceneName = "01_Level1_DataCleaning",
            zoneName = "DATA PROCESSING LAB",
            accentColor = new Color(0f, 0.85f, 0.85f),
            ambientColor = new Color(0.05f, 0.12f, 0.14f),
            fogColor = new Color(0.02f, 0.06f, 0.08f),
            doorLabel1 = "DATA INTAKE", doorLabel2 = "PROCESSING CORE", doorLabel3 = "SECTOR 1 EXIT",
            wallTint = new Color(0.13f, 0.16f, 0.18f),
            floorTint = new Color(0.10f, 0.13f, 0.15f)
        },
        new LevelTheme
        {
            level = 2, sceneName = "02_Level2_Regression",
            zoneName = "ANALYTICS WING",
            accentColor = new Color(1f, 0.6f, 0.15f),
            ambientColor = new Color(0.10f, 0.07f, 0.03f),
            fogColor = new Color(0.06f, 0.04f, 0.02f),
            doorLabel1 = "ANALYTICS PREP", doorLabel2 = "REGRESSION LAB", doorLabel3 = "SECTOR 2 EXIT",
            wallTint = new Color(0.16f, 0.14f, 0.12f),
            floorTint = new Color(0.13f, 0.11f, 0.09f)
        },
        new LevelTheme
        {
            level = 3, sceneName = "03_Level3_Classification",
            zoneName = "MEDICAL RESEARCH WING",
            accentColor = new Color(0.9f, 0.15f, 0.2f),
            ambientColor = new Color(0.10f, 0.04f, 0.04f),
            fogColor = new Color(0.06f, 0.02f, 0.02f),
            doorLabel1 = "BIO-SCAN PREP", doorLabel2 = "DIAGNOSTIC LAB", doorLabel3 = "SECTOR 3 EXIT",
            wallTint = new Color(0.17f, 0.13f, 0.13f),
            floorTint = new Color(0.14f, 0.10f, 0.10f)
        },
        new LevelTheme
        {
            level = 4, sceneName = "04_Level4_Clustering",
            zoneName = "MARKET INTELLIGENCE CENTER",
            accentColor = new Color(0.6f, 0.25f, 0.9f),
            ambientColor = new Color(0.07f, 0.04f, 0.10f),
            fogColor = new Color(0.04f, 0.02f, 0.06f),
            doorLabel1 = "INTEL BRIEFING", doorLabel2 = "CLUSTER ANALYSIS", doorLabel3 = "SECTOR 4 EXIT",
            wallTint = new Color(0.15f, 0.13f, 0.18f),
            floorTint = new Color(0.12f, 0.10f, 0.15f)
        },
        new LevelTheme
        {
            level = 5, sceneName = "05_Level5_Anomaly",
            zoneName = "FINANCIAL SECURITY VAULT",
            accentColor = new Color(1f, 0.8f, 0.1f),
            ambientColor = new Color(0.10f, 0.08f, 0.03f),
            fogColor = new Color(0.06f, 0.05f, 0.02f),
            doorLabel1 = "SECURITY CHECK", doorLabel2 = "FRAUD DETECTION", doorLabel3 = "VAULT EXIT",
            wallTint = new Color(0.16f, 0.15f, 0.11f),
            floorTint = new Color(0.13f, 0.12f, 0.08f)
        },
    };

    // =====================================================================
    // Menu Items
    // =====================================================================

    [MenuItem("BlackVault/Build Complete Facility (All Levels)", false, 0)]
    public static void BuildAllLevels()
    {
        BuildCompleteFacility();
    }

    [MenuItem("BlackVault/Build Single Levels/Build Level 1 Scene")]
    public static void BuildLevel1() => BuildSingleLevel(1);

    [MenuItem("BlackVault/Build Single Levels/Build Level 2 Scene")]
    public static void BuildLevel2() => BuildSingleLevel(2);

    [MenuItem("BlackVault/Build Single Levels/Build Level 3 Scene")]
    public static void BuildLevel3() => BuildSingleLevel(3);

    [MenuItem("BlackVault/Build Single Levels/Build Level 4 Scene")]
    public static void BuildLevel4() => BuildSingleLevel(4);

    [MenuItem("BlackVault/Build Single Levels/Build Level 5 Scene")]
    public static void BuildLevel5() => BuildSingleLevel(5);

    // =====================================================================
    // Room dimensions (per level section)
    // =====================================================================

    private const float WallHeight = 4f;
    private const float WallThickness = 0.2f;
    private const float CeilingY = WallHeight;

    // Each level section spans 28m along Z:
    //   Corridor (4m) + Ante-Chamber (8m) + Main Lab (12m) + Exit (4m) = 28m
    private const float SectionLength = 28f;

    private const float CorridorWidth = 4f;
    private const float CorridorLength = 4f;

    private const float AnteWidth = 6f;
    private const float AnteLength = 8f;

    private const float LabWidth = 10f;
    private const float LabLength = 12f;

    private const float ExitWidth = 6f;
    private const float ExitLength = 4f;

    // =====================================================================
    // BUILD COMPLETE FACILITY — All 5 levels in ONE scene
    // =====================================================================

    private static void BuildCompleteFacility()
    {
        EnsureEventSystem();

        // Use the first theme for global lighting (blended)
        SetupSceneLighting(Themes[0]);

        // Build player once at the very start
        float playerSpawnZ = -4f + 1.5f; // start of level 1 corridor
        GameObject player = BuildPlayer(playerSpawnZ, Themes[0]);
        GameObject canvas = BuildMLPuzzleCanvas(player);
        EnsureMobileCallSystem(player);

        // Build all 5 level sections sequentially along Z
        for (int i = 0; i < Themes.Length; i++)
        {
            LevelTheme theme = Themes[i];
            float zOffset = i * SectionLength; // each section is 28m

            bool isLastLevel = (i == Themes.Length - 1);

            BuildLevelSection(theme, zOffset, canvas, isLastLevel);
        }

        // Build connecting corridors between level exits and next level entries
        for (int i = 0; i < Themes.Length - 1; i++)
        {
            float connectZ = (i + 1) * SectionLength - 4f; // where level i+1 starts
            BuildConnectorCorridor(connectZ, Themes[i], Themes[i + 1]);
        }

        Debug.Log("[BlackVault] ★ COMPLETE FACILITY BUILT — All 5 mission labs in one scene! " +
                  "Save it and hit Play to walk through the entire facility.");
    }

    /// <summary>
    /// Builds one level's entire section (corridor + ante + lab + exit + doors + terminal)
    /// at a given Z offset.
    /// </summary>
    private static void BuildLevelSection(LevelTheme theme, float zOffset,
        GameObject canvas, bool isLastLevel)
    {
        // Calculate room start positions with offset
        float corridorStartZ = zOffset - 4f;
        float anteStartZ = zOffset;
        float labStartZ = zOffset + 8f;
        float exitStartZ = zOffset + 20f;

        // --- Root container for this level ---
        GameObject sectionRoot = new GameObject($"Level_{theme.level}_{theme.zoneName.Replace(" ", "_")}");

        // --- Materials ---
        Material wallMat = LabPropFactory.CreateMaterial(theme.wallTint, 0.2f, 0.3f);
        Material floorMat = LabPropFactory.CreateMaterial(theme.floorTint, 0.1f, 0.2f);
        Material ceilingMat = LabPropFactory.CreateMaterial(LabPropFactory.CeilingColor, 0.1f, 0.15f);

        // --- Zone label light (big overhead accent for the whole section) ---
        GameObject zoneLightObj = new GameObject("ZoneAccentLight");
        zoneLightObj.transform.SetParent(sectionRoot.transform);
        zoneLightObj.transform.position = new Vector3(0f, CeilingY - 0.5f, zOffset + SectionLength / 2f);
        Light zoneLight = zoneLightObj.AddComponent<Light>();
        zoneLight.type = LightType.Point;
        zoneLight.color = theme.accentColor;
        zoneLight.intensity = 0.5f;
        zoneLight.range = 20f;

        // ========================
        // ENTRY CORRIDOR
        // ========================
        GameObject corridor = new GameObject("EntryCorridorRoom");
        corridor.transform.SetParent(sectionRoot.transform);

        // First level gets a back wall; others connect to previous level's exit
        bool hasBackWall = (theme.level == 1);

        BuildRoom(corridor.transform,
            centerX: 0f, startZ: corridorStartZ,
            width: CorridorWidth, length: CorridorLength,
            wallMat, floorMat, ceilingMat,
            hasBackWall: hasBackWall, hasFrontWall: false,
            leftWallFull: true, rightWallFull: true);

        // Corridor props
        float corridorCenterZ = corridorStartZ + CorridorLength / 2f;
        LabPropFactory.CreateCeilingLightPanel(corridor.transform,
            new Vector3(0f, CeilingY - 0.05f, corridorCenterZ),
            theme.accentColor * 0.5f + Color.white * 0.5f, 1.5f, 0.4f, 0.8f);

        for (int a = 0; a < 3; a++)
        {
            LabPropFactory.CreateFloorMarking(corridor.transform,
                new Vector3(0f, 0f, corridorStartZ + 1f + a), theme.accentColor, 2f, 0.1f);
        }

        LabPropFactory.CreateWallPanel(corridor.transform,
            new Vector3(-CorridorWidth / 2f + 0.15f, WallHeight / 2f, corridorCenterZ),
            1.0f, 0.8f, 90f);
        LabPropFactory.CreateWallPanel(corridor.transform,
            new Vector3(CorridorWidth / 2f - 0.15f, WallHeight / 2f, corridorCenterZ),
            1.0f, 0.8f, -90f);

        // --- Zone Name Sign at corridor entrance ---
        BuildZoneSign(corridor.transform,
            new Vector3(0f, WallHeight - 0.5f, corridorStartZ + 0.5f),
            theme.zoneName, theme.accentColor);

        // ========================
        // DOOR 1 — Entry (auto-open)
        // ========================
        GameObject door1 = BuildDoubleDoor(sectionRoot.transform,
            new Vector3(0f, 0f, anteStartZ),
            theme.doorLabel1, theme.accentColor, autoOpen: true, startLocked: false);

        // ========================
        // ANTE-CHAMBER
        // ========================
        GameObject ante = new GameObject("AnteChamberRoom");
        ante.transform.SetParent(sectionRoot.transform);

        BuildRoom(ante.transform,
            centerX: 0f, startZ: anteStartZ,
            width: AnteWidth, length: AnteLength,
            wallMat, floorMat, ceilingMat,
            hasBackWall: false, hasFrontWall: false,
            leftWallFull: true, rightWallFull: true);

        // Transition walls corridor → ante
        float transWallWidth = (AnteWidth - CorridorWidth) / 2f;
        if (transWallWidth > 0.1f)
        {
            CreateWallWithMaterial("TransWall_Left", ante.transform,
                new Vector3(-CorridorWidth / 2f - transWallWidth / 2f, WallHeight / 2f, anteStartZ),
                new Vector3(transWallWidth, WallHeight, WallThickness), wallMat);
            CreateWallWithMaterial("TransWall_Right", ante.transform,
                new Vector3(CorridorWidth / 2f + transWallWidth / 2f, WallHeight / 2f, anteStartZ),
                new Vector3(transWallWidth, WallHeight, WallThickness), wallMat);
        }

        // Ante-chamber props
        float anteCenterZ = anteStartZ + AnteLength / 2f;

        LabPropFactory.CreateCeilingLightPanel(ante.transform,
            new Vector3(-1.2f, CeilingY - 0.05f, anteCenterZ - 1f),
            theme.accentColor * 0.4f + Color.white * 0.6f, 1.2f, 0.35f, 1f);
        LabPropFactory.CreateCeilingLightPanel(ante.transform,
            new Vector3(1.2f, CeilingY - 0.05f, anteCenterZ + 1f),
            theme.accentColor * 0.4f + Color.white * 0.6f, 1.2f, 0.35f, 1f);

        LabPropFactory.CreateServerRack(ante.transform,
            new Vector3(-AnteWidth / 2f + 0.6f, 0f, anteStartZ + 1.5f), theme.accentColor);
        LabPropFactory.CreateServerRack(ante.transform,
            new Vector3(-AnteWidth / 2f + 0.6f, 0f, anteStartZ + 3.5f), theme.accentColor);

        LabPropFactory.CreateWallScreen(ante.transform,
            new Vector3(AnteWidth / 2f - 0.15f, WallHeight * 0.55f, anteCenterZ),
            theme.accentColor * 0.7f, -90f, 1.5f, 0.9f);

        LabPropFactory.CreateDesk(ante.transform,
            new Vector3(1.5f, 0f, anteStartZ + 2f), theme.accentColor * 0.5f, 180f);

        LabPropFactory.CreateFloorMarking(ante.transform,
            new Vector3(-1.5f, 0f, anteStartZ + AnteLength - 0.5f), Color.yellow * 0.8f, 1.5f, 0.08f);
        LabPropFactory.CreateFloorMarking(ante.transform,
            new Vector3(1.5f, 0f, anteStartZ + AnteLength - 0.5f), Color.yellow * 0.8f, 1.5f, 0.08f);

        LabPropFactory.CreatePipe(ante.transform,
            new Vector3(-AnteWidth / 2f + 0.3f, CeilingY - 0.15f, anteCenterZ),
            AnteLength, 0.05f, new Vector3(0f, 0f, 90f));

        // ========================
        // DOOR 2 — Puzzle-locked
        // ========================
        GameObject door2 = BuildDoubleDoor(sectionRoot.transform,
            new Vector3(0f, 0f, labStartZ),
            theme.doorLabel2, theme.accentColor, autoOpen: false, startLocked: true);

        // Transition walls ante → lab
        float transWall2Width = (LabWidth - AnteWidth) / 2f;
        if (transWall2Width > 0.1f)
        {
            CreateWallWithMaterial("TransWall2_Left", sectionRoot.transform,
                new Vector3(-AnteWidth / 2f - transWall2Width / 2f, WallHeight / 2f, labStartZ),
                new Vector3(transWall2Width, WallHeight, WallThickness), wallMat);
            CreateWallWithMaterial("TransWall2_Right", sectionRoot.transform,
                new Vector3(AnteWidth / 2f + transWall2Width / 2f, WallHeight / 2f, labStartZ),
                new Vector3(transWall2Width, WallHeight, WallThickness), wallMat);
        }

        // ========================
        // MAIN LAB (big room)
        // ========================
        GameObject lab = new GameObject("MainLabRoom");
        lab.transform.SetParent(sectionRoot.transform);

        BuildRoom(lab.transform,
            centerX: 0f, startZ: labStartZ,
            width: LabWidth, length: LabLength,
            wallMat, floorMat, ceilingMat,
            hasBackWall: false, hasFrontWall: false,
            leftWallFull: true, rightWallFull: true);

        // Transition walls lab → exit
        float transWall3Width = (LabWidth - ExitWidth) / 2f;
        if (transWall3Width > 0.1f)
        {
            CreateWallWithMaterial("TransWall3_Left", lab.transform,
                new Vector3(-ExitWidth / 2f - transWall3Width / 2f, WallHeight / 2f, exitStartZ),
                new Vector3(transWall3Width, WallHeight, WallThickness), wallMat);
            CreateWallWithMaterial("TransWall3_Right", lab.transform,
                new Vector3(ExitWidth / 2f + transWall3Width / 2f, WallHeight / 2f, exitStartZ),
                new Vector3(transWall3Width, WallHeight, WallThickness), wallMat);
        }

        // Main lab props
        float labCenterZ = labStartZ + LabLength / 2f;

        // 4 ceiling lights
        LabPropFactory.CreateCeilingLightPanel(lab.transform,
            new Vector3(-2f, CeilingY - 0.05f, labCenterZ - 2f),
            theme.accentColor * 0.3f + Color.white * 0.7f, 1.5f, 0.4f, 1.2f);
        LabPropFactory.CreateCeilingLightPanel(lab.transform,
            new Vector3(2f, CeilingY - 0.05f, labCenterZ - 2f),
            theme.accentColor * 0.3f + Color.white * 0.7f, 1.5f, 0.4f, 1.2f);
        LabPropFactory.CreateCeilingLightPanel(lab.transform,
            new Vector3(-2f, CeilingY - 0.05f, labCenterZ + 2f),
            theme.accentColor * 0.3f + Color.white * 0.7f, 1.5f, 0.4f, 1.2f);
        LabPropFactory.CreateCeilingLightPanel(lab.transform,
            new Vector3(2f, CeilingY - 0.05f, labCenterZ + 2f),
            theme.accentColor * 0.3f + Color.white * 0.7f, 1.5f, 0.4f, 1.2f);

        // Server racks along walls
        float rackLeft = -LabWidth / 2f + 0.6f;
        float rackRight = LabWidth / 2f - 0.6f;
        for (int r = 0; r < 4; r++)
        {
            float z = labStartZ + 1.5f + r * 2.8f;
            LabPropFactory.CreateServerRack(lab.transform,
                new Vector3(rackLeft, 0f, z), theme.accentColor);
        }
        for (int r = 0; r < 3; r++)
        {
            float z = labStartZ + 2.5f + r * 3.2f;
            LabPropFactory.CreateServerRack(lab.transform,
                new Vector3(rackRight, 0f, z), theme.accentColor);
        }

        // Work desks
        LabPropFactory.CreateDesk(lab.transform,
            new Vector3(-2f, 0f, labCenterZ - 1f), theme.accentColor * 0.6f, 0f);
        LabPropFactory.CreateDesk(lab.transform,
            new Vector3(2f, 0f, labCenterZ + 1f), theme.accentColor * 0.6f, 180f);

        // Wall screens
        LabPropFactory.CreateWallScreen(lab.transform,
            new Vector3(-LabWidth / 2f + 0.15f, WallHeight * 0.6f, labCenterZ - 3f),
            theme.accentColor * 0.5f, 90f, 2f, 1.2f);
        LabPropFactory.CreateWallScreen(lab.transform,
            new Vector3(LabWidth / 2f - 0.15f, WallHeight * 0.6f, labCenterZ + 1f),
            theme.accentColor * 0.5f, -90f, 2f, 1.2f);

        // Railing
        LabPropFactory.CreateRailing(lab.transform,
            new Vector3(0f, 0f, labCenterZ - 3f), 4f);

        // Floor markings
        for (int f = 0; f < 5; f++)
        {
            float z = labStartZ + 1f + f * 2.5f;
            LabPropFactory.CreateFloorMarking(lab.transform,
                new Vector3(0f, 0f, z), theme.accentColor * 0.6f, 0.3f, 1.5f, 90f);
        }

        // Ceiling pipes
        LabPropFactory.CreatePipe(lab.transform,
            new Vector3(-LabWidth / 2f + 0.3f, CeilingY - 0.15f, labCenterZ),
            LabLength, 0.06f, new Vector3(0f, 0f, 90f));
        LabPropFactory.CreatePipe(lab.transform,
            new Vector3(LabWidth / 2f - 0.3f, CeilingY - 0.15f, labCenterZ),
            LabLength, 0.06f, new Vector3(0f, 0f, 90f));

        // Wall panels
        LabPropFactory.CreateWallPanel(lab.transform,
            new Vector3(-LabWidth / 2f + 0.15f, WallHeight * 0.35f, labStartZ + 2f),
            1.2f, 0.8f, 90f);
        LabPropFactory.CreateWallPanel(lab.transform,
            new Vector3(LabWidth / 2f - 0.15f, WallHeight * 0.35f, labCenterZ + 4f),
            1.2f, 0.8f, -90f);

        // Guard AI & Stealth Hiding Spots
        BuildGuardAndHidingSpots(sectionRoot.transform, labStartZ, theme);

        // Story Comms Call Triggers
        BuildStoryCallTriggers(theme, zOffset, sectionRoot.transform);

        // ========================
        // DOOR 3 — Exit (chained)
        // ========================
        GameObject door3 = BuildDoubleDoor(sectionRoot.transform,
            new Vector3(0f, 0f, exitStartZ),
            theme.doorLabel3, theme.accentColor, autoOpen: false, startLocked: true);

        // Chain door3 to door2
        DoorController dc2 = door2.GetComponent<DoorController>();
        DoorController dc3 = door3.GetComponent<DoorController>();
        dc2.chainedDoor = dc3;

        // ========================
        // EXIT CHAMBER
        // ========================
        GameObject exit = new GameObject("ExitChamberRoom");
        exit.transform.SetParent(sectionRoot.transform);

        BuildRoom(exit.transform,
            centerX: 0f, startZ: exitStartZ,
            width: ExitWidth, length: ExitLength,
            wallMat, floorMat, ceilingMat,
            hasBackWall: false, hasFrontWall: isLastLevel,
            leftWallFull: true, rightWallFull: true);

        float exitCenterZ = exitStartZ + ExitLength / 2f;
        LabPropFactory.CreateCeilingLightPanel(exit.transform,
            new Vector3(0f, CeilingY - 0.05f, exitCenterZ),
            Color.green * 0.5f + Color.white * 0.5f, 1.5f, 0.4f, 1f);
        LabPropFactory.CreateFloorMarking(exit.transform,
            new Vector3(0f, 0f, exitCenterZ), Color.green * 0.8f, 2f, 0.15f);

        // ========================
        // TERMINAL in main lab
        // ========================
        float terminalZ = labStartZ + 2.5f;
        GameObject terminal = BuildTerminal(door2, dc3, theme, terminalZ);

        // Wire terminal to the shared ML Puzzle Canvas
        WireTerminal(terminal, canvas, door2);

        Debug.Log($"[BlackVault] Level {theme.level} ({theme.zoneName}) section built at Z offset {zOffset}.");
    }

    /// <summary>
    /// Builds a short connecting corridor between two level sections.
    /// This fills the gap between level N's exit and level N+1's entry.
    /// </summary>
    private static void BuildConnectorCorridor(float startZ, LevelTheme fromTheme, LevelTheme toTheme)
    {
        // The exit chamber ends at startZ, the next corridor starts at startZ
        // They share the same Z, so we just need transition walls if widths differ

        // Blend the colors between the two levels for a cool transition effect
        Color blendWall = Color.Lerp(fromTheme.wallTint, toTheme.wallTint, 0.5f);
        Color blendAccent = Color.Lerp(fromTheme.accentColor, toTheme.accentColor, 0.5f);

        // Transition walls from exit width to next corridor width
        float transWidth = (ExitWidth - CorridorWidth) / 2f;
        Material wallMat = LabPropFactory.CreateMaterial(blendWall, 0.2f, 0.3f);

        if (transWidth > 0.1f)
        {
            CreateWallWithMaterial("Connector_TransLeft", null,
                new Vector3(-CorridorWidth / 2f - transWidth / 2f, WallHeight / 2f, startZ),
                new Vector3(transWidth, WallHeight, WallThickness), wallMat);
            CreateWallWithMaterial("Connector_TransRight", null,
                new Vector3(CorridorWidth / 2f + transWidth / 2f, WallHeight / 2f, startZ),
                new Vector3(transWidth, WallHeight, WallThickness), wallMat);
        }

        // A colored floor strip marking the zone transition
        LabPropFactory.CreateFloorMarking(null,
            new Vector3(0f, 0f, startZ), blendAccent, 3f, 0.2f);

        // Transition accent light
        GameObject lightObj = new GameObject("TransitionLight");
        lightObj.transform.position = new Vector3(0f, CeilingY - 0.5f, startZ);
        Light light = lightObj.AddComponent<Light>();
        light.type = LightType.Point;
        light.color = blendAccent;
        light.intensity = 1f;
        light.range = 6f;
    }

    // =====================================================================
    // BUILD SINGLE LEVEL (standalone scene)
    // =====================================================================

    private static void BuildSingleLevel(int levelNumber)
    {
        var theme = System.Array.Find(Themes, t => t.level == levelNumber);
        if (theme.level == 0)
        {
            Debug.LogError($"[BlackVault] No theme found for level {levelNumber}.");
            return;
        }

        EnsureEventSystem();
        SetupSceneLighting(theme);

        GameObject player = BuildPlayer(-2.5f, theme);
        GameObject canvas = BuildMLPuzzleCanvas(player);

        BuildLevelSection(theme, 0f, canvas, true);

        Debug.Log($"[BlackVault] Level {levelNumber} ({theme.zoneName}) scene built. " +
                  $"Save it as {theme.sceneName}.unity.");
    }

    // =====================================================================
    // Event System
    // =====================================================================

    private static void EnsureEventSystem()
    {
        if (UnityEngine.EventSystems.EventSystem.current != null) return;

        GameObject esObj = new GameObject("EventSystem");
        esObj.AddComponent<UnityEngine.EventSystems.EventSystem>();
        esObj.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
    }

    // =====================================================================
    // Scene Lighting
    // =====================================================================

    private static void SetupSceneLighting(LevelTheme theme)
    {
        GameObject lightObj = new GameObject("Directional Light");
        Light dirLight = lightObj.AddComponent<Light>();
        dirLight.type = LightType.Directional;
        dirLight.intensity = 0.3f;
        dirLight.color = theme.accentColor * 0.3f + Color.white * 0.7f;
        lightObj.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

        RenderSettings.ambientMode = UnityEngine.Rendering.AmbientMode.Flat;
        RenderSettings.ambientLight = theme.ambientColor;

        RenderSettings.fog = true;
        RenderSettings.fogMode = FogMode.Exponential;
        RenderSettings.fogDensity = 0.015f;
        RenderSettings.fogColor = theme.fogColor;
    }

    // =====================================================================
    // Zone Name Sign (big label at section entrance)
    // =====================================================================

    private static void BuildZoneSign(Transform parent, Vector3 localPos,
        string zoneName, Color accent)
    {
        GameObject signRoot = new GameObject("ZoneSign");
        signRoot.transform.SetParent(parent, false);
        signRoot.transform.localPosition = localPos;

        // Background panel
        GameObject bg = GameObject.CreatePrimitive(PrimitiveType.Cube);
        bg.name = "SignBackground";
        bg.transform.SetParent(signRoot.transform, false);
        bg.transform.localPosition = Vector3.zero;
        bg.transform.localScale = new Vector3(3f, 0.5f, 0.05f);
        bg.GetComponent<Renderer>().material = LabPropFactory.CreateMaterial(
            new Color(0.03f, 0.03f, 0.04f), 0.2f, 0.1f);
        Object.DestroyImmediate(bg.GetComponent<Collider>());

        // Emissive border
        GameObject border = GameObject.CreatePrimitive(PrimitiveType.Cube);
        border.name = "SignBorder";
        border.transform.SetParent(signRoot.transform, false);
        border.transform.localPosition = new Vector3(0f, 0f, 0.03f);
        border.transform.localScale = new Vector3(3.1f, 0.55f, 0.01f);
        border.GetComponent<Renderer>().material = LabPropFactory.CreateEmissiveMaterial(accent * 0.5f, 1.5f);
        Object.DestroyImmediate(border.GetComponent<Collider>());

        // 3D Text
        GameObject textObj = new GameObject("ZoneNameText");
        textObj.transform.SetParent(signRoot.transform, false);
        textObj.transform.localPosition = new Vector3(0f, 0f, 0.035f);
        TextMesh tm = textObj.AddComponent<TextMesh>();
        tm.text = $"◆  {zoneName}  ◆";
        tm.fontSize = 48;
        tm.characterSize = 0.06f;
        tm.anchor = TextAnchor.MiddleCenter;
        tm.alignment = TextAlignment.Center;
        tm.color = accent;
        tm.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        MeshRenderer textRenderer = textObj.GetComponent<MeshRenderer>();
        textRenderer.material = tm.font.material;
        textRenderer.material.color = accent;
    }

    // =====================================================================
    // Room Builder
    // =====================================================================

    private static void BuildRoom(Transform parent,
        float centerX, float startZ, float width, float length,
        Material wallMat, Material floorMat, Material ceilingMat,
        bool hasBackWall, bool hasFrontWall,
        bool leftWallFull, bool rightWallFull)
    {
        float midZ = startZ + length / 2f;
        float endZ = startZ + length;

        GameObject floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
        floor.name = "Floor";
        floor.transform.SetParent(parent, false);
        floor.transform.position = new Vector3(centerX, -0.05f, midZ);
        floor.transform.localScale = new Vector3(width, 0.1f, length);
        floor.GetComponent<Renderer>().material = floorMat;

        GameObject ceiling = GameObject.CreatePrimitive(PrimitiveType.Cube);
        ceiling.name = "Ceiling";
        ceiling.transform.SetParent(parent, false);
        ceiling.transform.position = new Vector3(centerX, CeilingY + 0.05f, midZ);
        ceiling.transform.localScale = new Vector3(width, 0.1f, length);
        ceiling.GetComponent<Renderer>().material = ceilingMat;
        Object.DestroyImmediate(ceiling.GetComponent<Collider>());

        if (leftWallFull)
        {
            GameObject wallLeft = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wallLeft.name = "Wall_Left";
            wallLeft.transform.SetParent(parent, false);
            wallLeft.transform.position = new Vector3(centerX - width / 2f, WallHeight / 2f, midZ);
            wallLeft.transform.localScale = new Vector3(WallThickness, WallHeight, length);
            wallLeft.GetComponent<Renderer>().material = wallMat;
        }

        if (rightWallFull)
        {
            GameObject wallRight = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wallRight.name = "Wall_Right";
            wallRight.transform.SetParent(parent, false);
            wallRight.transform.position = new Vector3(centerX + width / 2f, WallHeight / 2f, midZ);
            wallRight.transform.localScale = new Vector3(WallThickness, WallHeight, length);
            wallRight.GetComponent<Renderer>().material = wallMat;
        }

        if (hasBackWall)
        {
            GameObject wallBack = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wallBack.name = "Wall_Back";
            wallBack.transform.SetParent(parent, false);
            wallBack.transform.position = new Vector3(centerX, WallHeight / 2f, startZ);
            wallBack.transform.localScale = new Vector3(width, WallHeight, WallThickness);
            wallBack.GetComponent<Renderer>().material = wallMat;
        }

        if (hasFrontWall)
        {
            GameObject wallFront = GameObject.CreatePrimitive(PrimitiveType.Cube);
            wallFront.name = "Wall_Front";
            wallFront.transform.SetParent(parent, false);
            wallFront.transform.position = new Vector3(centerX, WallHeight / 2f, endZ);
            wallFront.transform.localScale = new Vector3(width, WallHeight, WallThickness);
            wallFront.GetComponent<Renderer>().material = wallMat;
        }
    }

    private static void CreateWallWithMaterial(string name, Transform parent,
        Vector3 position, Vector3 scale, Material mat)
    {
        GameObject wall = GameObject.CreatePrimitive(PrimitiveType.Cube);
        wall.name = name;
        if (parent != null) wall.transform.SetParent(parent, false);
        wall.transform.position = position;
        wall.transform.localScale = scale;
        wall.GetComponent<Renderer>().material = mat;
    }

    // =====================================================================
    // Double Door Builder
    // =====================================================================

    private static GameObject BuildDoubleDoor(Transform parent, Vector3 position,
        string label, Color accent, bool autoOpen, bool startLocked)
    {
        float doorWidth = 3.2f;
        float doorHeight = 3.2f;
        float panelWidth = doorWidth / 2f;
        float frameDepth = 0.35f;

        GameObject root = new GameObject($"Door_{label.Replace(" ", "_")}");
        if (parent != null) root.transform.SetParent(parent, false);
        root.transform.position = position;

        Material frameMat = LabPropFactory.CreateMaterial(LabPropFactory.TrimColor, 0.6f, 0.4f);

        // Frame columns
        GameObject frameLeft = GameObject.CreatePrimitive(PrimitiveType.Cube);
        frameLeft.name = "FrameLeft";
        frameLeft.transform.SetParent(root.transform, false);
        frameLeft.transform.localPosition = new Vector3(-doorWidth / 2f - 0.15f, doorHeight / 2f, 0f);
        frameLeft.transform.localScale = new Vector3(0.3f, doorHeight, frameDepth);
        frameLeft.GetComponent<Renderer>().material = frameMat;

        GameObject frameRight = GameObject.CreatePrimitive(PrimitiveType.Cube);
        frameRight.name = "FrameRight";
        frameRight.transform.SetParent(root.transform, false);
        frameRight.transform.localPosition = new Vector3(doorWidth / 2f + 0.15f, doorHeight / 2f, 0f);
        frameRight.transform.localScale = new Vector3(0.3f, doorHeight, frameDepth);
        frameRight.GetComponent<Renderer>().material = frameMat;

        GameObject frameTop = GameObject.CreatePrimitive(PrimitiveType.Cube);
        frameTop.name = "FrameTop";
        frameTop.transform.SetParent(root.transform, false);
        frameTop.transform.localPosition = new Vector3(0f, doorHeight + 0.15f, 0f);
        frameTop.transform.localScale = new Vector3(doorWidth + 0.6f, 0.3f, frameDepth);
        frameTop.GetComponent<Renderer>().material = frameMat;

        // LED strips
        Material ledMat = LabPropFactory.CreateEmissiveMaterial(accent, 3f);

        GameObject ledLeft = GameObject.CreatePrimitive(PrimitiveType.Cube);
        ledLeft.name = "LedStripLeft";
        ledLeft.transform.SetParent(root.transform, false);
        ledLeft.transform.localPosition = new Vector3(-doorWidth / 2f + 0.02f, doorHeight / 2f, frameDepth / 2f + 0.01f);
        ledLeft.transform.localScale = new Vector3(0.03f, doorHeight - 0.2f, 0.02f);
        ledLeft.GetComponent<Renderer>().material = ledMat;
        Object.DestroyImmediate(ledLeft.GetComponent<Collider>());

        GameObject ledRight = GameObject.CreatePrimitive(PrimitiveType.Cube);
        ledRight.name = "LedStripRight";
        ledRight.transform.SetParent(root.transform, false);
        ledRight.transform.localPosition = new Vector3(doorWidth / 2f - 0.02f, doorHeight / 2f, frameDepth / 2f + 0.01f);
        ledRight.transform.localScale = new Vector3(0.03f, doorHeight - 0.2f, 0.02f);
        ledRight.GetComponent<Renderer>().material = ledMat;
        Object.DestroyImmediate(ledRight.GetComponent<Collider>());

        GameObject ledTop = GameObject.CreatePrimitive(PrimitiveType.Cube);
        ledTop.name = "LedStripTop";
        ledTop.transform.SetParent(root.transform, false);
        ledTop.transform.localPosition = new Vector3(0f, doorHeight - 0.02f, frameDepth / 2f + 0.01f);
        ledTop.transform.localScale = new Vector3(doorWidth - 0.1f, 0.03f, 0.02f);
        ledTop.GetComponent<Renderer>().material = ledMat;
        Object.DestroyImmediate(ledTop.GetComponent<Collider>());

        // Door panels
        Material doorMat = LabPropFactory.CreateMaterial(
            LabPropFactory.PropDarkMetal * 1.2f, 0.7f, 0.5f);

        GameObject panelLeft = GameObject.CreatePrimitive(PrimitiveType.Cube);
        panelLeft.name = "DoorPanelLeft";
        panelLeft.transform.SetParent(root.transform, false);
        panelLeft.transform.localPosition = new Vector3(-panelWidth / 2f, doorHeight / 2f, 0f);
        panelLeft.transform.localScale = new Vector3(panelWidth, doorHeight, 0.12f);
        panelLeft.GetComponent<Renderer>().material = doorMat;
        Object.DestroyImmediate(panelLeft.GetComponent<Collider>());

        GameObject panelRight = GameObject.CreatePrimitive(PrimitiveType.Cube);
        panelRight.name = "DoorPanelRight";
        panelRight.transform.SetParent(root.transform, false);
        panelRight.transform.localPosition = new Vector3(panelWidth / 2f, doorHeight / 2f, 0f);
        panelRight.transform.localScale = new Vector3(panelWidth, doorHeight, 0.12f);
        panelRight.GetComponent<Renderer>().material = doorMat;
        Object.DestroyImmediate(panelRight.GetComponent<Collider>());

        // Label sign
        GameObject labelObj = new GameObject("DoorLabel");
        labelObj.transform.SetParent(root.transform, false);
        labelObj.transform.localPosition = new Vector3(0f, doorHeight + 0.55f, frameDepth / 2f + 0.01f);

        GameObject labelBg = GameObject.CreatePrimitive(PrimitiveType.Cube);
        labelBg.name = "LabelBackground";
        labelBg.transform.SetParent(labelObj.transform, false);
        labelBg.transform.localPosition = Vector3.zero;
        labelBg.transform.localScale = new Vector3(2.5f, 0.35f, 0.03f);
        labelBg.GetComponent<Renderer>().material = LabPropFactory.CreateMaterial(
            new Color(0.05f, 0.05f, 0.06f), 0.3f, 0.2f);
        Object.DestroyImmediate(labelBg.GetComponent<Collider>());

        GameObject textObj = new GameObject("LabelText");
        textObj.transform.SetParent(labelObj.transform, false);
        textObj.transform.localPosition = new Vector3(0f, 0f, 0.025f);
        TextMesh textMesh = textObj.AddComponent<TextMesh>();
        textMesh.text = label;
        textMesh.fontSize = 48;
        textMesh.characterSize = 0.08f;
        textMesh.anchor = TextAnchor.MiddleCenter;
        textMesh.alignment = TextAlignment.Center;
        textMesh.color = accent;
        textMesh.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        MeshRenderer textRenderer = textObj.GetComponent<MeshRenderer>();
        textRenderer.material = textMesh.font.material;
        textRenderer.material.color = accent;

        // Status light
        GameObject statusLightObj = new GameObject("StatusLight");
        statusLightObj.transform.SetParent(root.transform, false);
        statusLightObj.transform.localPosition = new Vector3(0f, doorHeight + 0.9f, 0f);
        Light statusLight = statusLightObj.AddComponent<Light>();
        statusLight.type = LightType.Point;
        statusLight.range = 5f;
        statusLight.intensity = 1.5f;
        statusLight.color = startLocked ? Color.red : Color.green;

        // Blocking collider
        GameObject blocker = new GameObject("BlockingCollider");
        blocker.transform.SetParent(root.transform, false);
        blocker.transform.localPosition = Vector3.zero;
        BoxCollider blockerCollider = blocker.AddComponent<BoxCollider>();
        blockerCollider.size = new Vector3(doorWidth, doorHeight, 0.3f);
        blockerCollider.center = new Vector3(0f, doorHeight / 2f, 0f);

        // Auto-open trigger
        if (autoOpen)
        {
            SphereCollider trigger = root.AddComponent<SphereCollider>();
            trigger.isTrigger = true;
            trigger.radius = 3f;
            trigger.center = new Vector3(0f, 1f, 0f);
        }

        // Card scanner
        LabPropFactory.CreateCardScanner(root.transform,
            new Vector3(doorWidth / 2f + 0.5f, 1.2f, frameDepth / 2f),
            startLocked ? Color.red : Color.green);

        // DoorController
        DoorController controller = root.AddComponent<DoorController>();
        controller.doorMesh = panelLeft.transform;
        controller.doorMeshRight = panelRight.transform;
        controller.blockingCollider = blockerCollider;
        controller.statusLight = statusLight;
        controller.startLocked = startLocked;
        controller.autoOpen = autoOpen;
        controller.doorLabel = label;
        controller.frameAccentColor = accent;
        controller.openOffset = new Vector3(-panelWidth / 2f - 0.1f, 0f, 0f);
        controller.openDuration = 1.5f;

        return root;
    }

    // =====================================================================
    // Terminal Builder (with configurable Z position)
    // =====================================================================

    private static GameObject BuildTerminal(GameObject primaryDoor, DoorController exitDoor,
        LevelTheme theme, float terminalZ)
    {
        GameObject terminal = new GameObject($"Terminal_L{theme.level}");
        terminal.transform.position = new Vector3(-2.5f, 0f, terminalZ);

        // Console body
        GameObject terminalBase = GameObject.CreatePrimitive(PrimitiveType.Cube);
        terminalBase.name = "TerminalBase";
        terminalBase.transform.SetParent(terminal.transform, false);
        terminalBase.transform.localPosition = new Vector3(0f, 0.5f, 0f);
        terminalBase.transform.localScale = new Vector3(0.8f, 1f, 0.5f);
        terminalBase.GetComponent<Renderer>().material =
            LabPropFactory.CreateMaterial(LabPropFactory.PropDarkMetal, 0.6f, 0.4f);

        // Screen
        GameObject terminalScreen = GameObject.CreatePrimitive(PrimitiveType.Cube);
        terminalScreen.name = "TerminalScreen";
        terminalScreen.transform.SetParent(terminal.transform, false);
        terminalScreen.transform.localPosition = new Vector3(0f, 1.2f, -0.1f);
        terminalScreen.transform.localScale = new Vector3(0.7f, 0.5f, 0.04f);
        terminalScreen.transform.localEulerAngles = new Vector3(-15f, 0f, 0f);
        terminalScreen.GetComponent<Renderer>().material =
            LabPropFactory.CreateEmissiveMaterial(theme.accentColor * 0.6f, 2f);
        Object.DestroyImmediate(terminalScreen.GetComponent<Collider>());

        // Screen frame
        GameObject terminalFrame = GameObject.CreatePrimitive(PrimitiveType.Cube);
        terminalFrame.name = "TerminalFrame";
        terminalFrame.transform.SetParent(terminal.transform, false);
        terminalFrame.transform.localPosition = new Vector3(0f, 1.2f, -0.12f);
        terminalFrame.transform.localScale = new Vector3(0.8f, 0.58f, 0.03f);
        terminalFrame.transform.localEulerAngles = new Vector3(-15f, 0f, 0f);
        terminalFrame.GetComponent<Renderer>().material =
            LabPropFactory.CreateMaterial(LabPropFactory.TrimColor, 0.5f, 0.4f);
        Object.DestroyImmediate(terminalFrame.GetComponent<Collider>());

        // Glow
        GameObject termGlow = new GameObject("TerminalGlow");
        termGlow.transform.SetParent(terminal.transform, false);
        termGlow.transform.localPosition = new Vector3(0f, 1.2f, 0.3f);
        Light glow = termGlow.AddComponent<Light>();
        glow.type = LightType.Point;
        glow.color = theme.accentColor;
        glow.intensity = 1f;
        glow.range = 3f;

        // Trigger
        SphereCollider trigger = terminal.AddComponent<SphereCollider>();
        trigger.isTrigger = true;
        trigger.radius = 2.5f;

        // Interact prompt
        GameObject promptCanvasObj = new GameObject("InteractPrompt");
        promptCanvasObj.transform.SetParent(terminal.transform, false);
        promptCanvasObj.transform.localPosition = new Vector3(0f, 2f, 0f);
        Canvas promptCanvas = promptCanvasObj.AddComponent<Canvas>();
        promptCanvas.renderMode = RenderMode.WorldSpace;
        promptCanvasObj.transform.localScale = Vector3.one * 0.01f;
        promptCanvasObj.AddComponent<CanvasScaler>();
        promptCanvasObj.AddComponent<GraphicRaycaster>();

        GameObject promptTextObj = new GameObject("PromptText");
        promptTextObj.transform.SetParent(promptCanvasObj.transform, false);
        Text promptText = promptTextObj.AddComponent<Text>();
        promptText.text = "Press E to interact";
        promptText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
        promptText.alignment = TextAnchor.MiddleCenter;
        promptText.color = theme.accentColor;
        promptText.fontSize = 24;
        promptText.fontStyle = FontStyle.Bold;
        promptText.rectTransform.sizeDelta = new Vector2(500f, 60f);
        promptText.rectTransform.localPosition = Vector3.zero;

        promptCanvasObj.SetActive(false);

        // Terminal script
        TerminalInteractable interactable = terminal.AddComponent<TerminalInteractable>();
        interactable.level = theme.level;
        interactable.interactPrompt = promptCanvasObj;
        interactable.linkedDoor = primaryDoor.GetComponent<DoorController>();
        interactable.secondaryDoor = exitDoor;

        return terminal;
    }

    // =====================================================================
    // Player Builder
    // =====================================================================

    private static GameObject BuildPlayer(float spawnZ, LevelTheme theme)
    {
        GameObject player = new GameObject("Player");
        player.transform.position = new Vector3(0f, 0.1f, spawnZ);

        CharacterController cc = player.AddComponent<CharacterController>();
        cc.radius = 0.4f;
        cc.height = 1.8f;
        cc.center = new Vector3(0f, 0.9f, 0f);

        GameObject model = GameObject.CreatePrimitive(PrimitiveType.Capsule);
        model.name = "PlayerModel";
        model.transform.SetParent(player.transform, false);
        model.transform.localPosition = new Vector3(0f, 0.9f, 0f);
        Object.DestroyImmediate(model.GetComponent<CapsuleCollider>());

        GameObject fpRig = new GameObject("FirstPersonCameraRig");
        fpRig.transform.SetParent(player.transform, false);
        fpRig.transform.localPosition = new Vector3(0f, 1.6f, 0f);
        GameObject fpCamObj = new GameObject("FirstPersonCamera");
        fpCamObj.transform.SetParent(fpRig.transform, false);
        fpCamObj.transform.localPosition = Vector3.zero;
        Camera fpCam = fpCamObj.AddComponent<Camera>();
        fpCam.clearFlags = CameraClearFlags.SolidColor;
        fpCam.backgroundColor = theme.fogColor;
        fpCamObj.AddComponent<AudioListener>();

        GameObject tpRig = new GameObject("ThirdPersonCameraRig");
        tpRig.transform.SetParent(player.transform, false);
        tpRig.transform.localPosition = new Vector3(0f, 2f, -4f);
        GameObject tpCamObj = new GameObject("ThirdPersonCamera");
        tpCamObj.transform.SetParent(tpRig.transform, false);
        tpCamObj.transform.localPosition = Vector3.zero;
        Camera tpCam = tpCamObj.AddComponent<Camera>();
        tpCam.clearFlags = CameraClearFlags.SolidColor;
        tpCam.backgroundColor = theme.fogColor;
        tpCamObj.SetActive(false);

        PlayerController controller = player.AddComponent<PlayerController>();
        controller.firstPersonCamera = fpCam;
        controller.thirdPersonCamera = tpCam;
        controller.thirdPersonLookTarget = player.transform;
        controller.playerModel = model;
        controller.startInFirstPerson = true;
        model.SetActive(false);

        // Stealth system & 3D Phone Prop integration
        player.AddComponent<StealthController>();
        fpCamObj.AddComponent<PhonePropController>();

        Camera mainCam = Camera.main;
        if (mainCam != null && mainCam.gameObject.name == "Main Camera")
        {
            Object.DestroyImmediate(mainCam.gameObject);
        }

        if (System.Array.IndexOf(UnityEditorInternal.InternalEditorUtility.tags, "Player") >= 0)
        {
            player.tag = "Player";
        }
        else
        {
            Debug.LogWarning("[BlackVault] 'Player' tag doesn't exist. " +
                              "Add it via Edit > Project Settings > Tags and Layers.");
        }

        return player;
    }

    // =====================================================================
    // ML Puzzle UI Canvas
    // =====================================================================

    private static GameObject BuildMLPuzzleCanvas(GameObject player)
    {
        var uiResources = new DefaultControls.Resources();

        GameObject canvasObj = new GameObject("Canvas_MLPuzzle");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvasObj.AddComponent<CanvasScaler>();
        canvasObj.AddComponent<GraphicRaycaster>();

        GameObject panel = DefaultControls.CreatePanel(uiResources);
        panel.name = "PuzzlePanel";
        panel.transform.SetParent(canvasObj.transform, false);
        panel.GetComponent<Image>().color = new Color(0.12f, 0.12f, 0.14f, 0.98f);
        RectTransform panelRect = panel.GetComponent<RectTransform>();
        panelRect.offsetMin = new Vector2(40f, 30f);
        panelRect.offsetMax = new Vector2(-40f, -30f);

        Text missionInfoText = CreateTopText(uiResources, panel.transform, "MissionInfoText",
            "Loading mission...", 20f, 100f, 20);
        missionInfoText.fontStyle = FontStyle.Bold;
        missionInfoText.color = new Color(0.95f, 0.35f, 0.35f);
        missionInfoText.supportRichText = true;

        Text statsText = CreateTopText(uiResources, panel.transform, "StatsText", "", 130f, 26f, 14);
        statsText.color = new Color(0.65f, 0.65f, 0.7f);

        GameObject codeEditorObj = DefaultControls.CreateInputField(uiResources);
        codeEditorObj.name = "CodeEditorField";
        codeEditorObj.transform.SetParent(panel.transform, false);
        InputField codeEditor = codeEditorObj.GetComponent<InputField>();
        codeEditor.lineType = InputField.LineType.MultiLineNewline;
        codeEditorObj.GetComponent<Image>().color = new Color(0.15f, 0.16f, 0.18f, 1f);
        RectTransform codeEditorRect = codeEditorObj.GetComponent<RectTransform>();
        codeEditorRect.anchorMin = new Vector2(0f, 0f);
        codeEditorRect.anchorMax = new Vector2(1f, 1f);
        codeEditorRect.offsetMin = new Vector2(20f, 95f);
        codeEditorRect.offsetMax = new Vector2(-20f, -170f);

        Text inputVisibleText = codeEditor.textComponent as Text;
        if (inputVisibleText != null)
        {
            inputVisibleText.color = new Color(1f, 1f, 1f, 0f);
            inputVisibleText.fontSize = 15;
        }

        GameObject overlayObj = DefaultControls.CreateText(uiResources);
        overlayObj.name = "HighlightOverlay";
        overlayObj.transform.SetParent(codeEditorObj.transform, false);
        Text overlayText = overlayObj.GetComponent<Text>();
        overlayText.supportRichText = true;
        overlayText.fontSize = 15;
        overlayText.color = new Color(0.85f, 0.85f, 0.88f);
        overlayText.alignment = TextAnchor.UpperLeft;
        overlayText.horizontalOverflow = HorizontalWrapMode.Wrap;
        overlayText.verticalOverflow = VerticalWrapMode.Overflow;
        overlayText.raycastTarget = false;
        RectTransform overlayRect = overlayObj.GetComponent<RectTransform>();
        overlayRect.anchorMin = Vector2.zero;
        overlayRect.anchorMax = Vector2.one;
        overlayRect.offsetMin = new Vector2(10f, 6f);
        overlayRect.offsetMax = new Vector2(-10f, -7f);

        PythonHighlighter highlighter = codeEditorObj.AddComponent<PythonHighlighter>();
        highlighter.inputField = codeEditor;
        highlighter.overlayText = overlayText;

        GameObject runObj = DefaultControls.CreateButton(uiResources);
        runObj.name = "RunButton";
        runObj.transform.SetParent(panel.transform, false);
        Text runLabel = runObj.GetComponentInChildren<Text>();
        runLabel.text = "▶  Run";
        runLabel.fontStyle = FontStyle.Bold;
        runLabel.color = Color.white;
        runObj.GetComponent<Image>().color = new Color(0.2f, 0.65f, 0.35f);
        RectTransform runRect = runObj.GetComponent<RectTransform>();
        runRect.anchorMin = runRect.anchorMax = new Vector2(0.5f, 0f);
        runRect.pivot = new Vector2(0.5f, 0f);
        runRect.anchoredPosition = new Vector2(-100f, 20f);
        runRect.sizeDelta = new Vector2(150f, 45f);

        GameObject closeObj = DefaultControls.CreateButton(uiResources);
        closeObj.name = "CloseButton";
        closeObj.transform.SetParent(panel.transform, false);
        Text closeLabel = closeObj.GetComponentInChildren<Text>();
        closeLabel.text = "Close";
        closeLabel.color = Color.white;
        closeObj.GetComponent<Image>().color = new Color(0.3f, 0.3f, 0.34f);
        RectTransform closeRect = closeObj.GetComponent<RectTransform>();
        closeRect.anchorMin = closeRect.anchorMax = new Vector2(0.5f, 0f);
        closeRect.pivot = new Vector2(0.5f, 0f);
        closeRect.anchoredPosition = new Vector2(100f, 20f);
        closeRect.sizeDelta = new Vector2(150f, 45f);

        Text resultText = CreateBottomText(uiResources, panel.transform, "ResultText", "", 75f, 28f, 15);
        resultText.fontStyle = FontStyle.Bold;

        MLPuzzleUI puzzleUI = canvasObj.AddComponent<MLPuzzleUI>();
        puzzleUI.panelRoot = panel;
        puzzleUI.missionInfoText = missionInfoText;
        puzzleUI.statsText = statsText;
        puzzleUI.codeEditor = codeEditor;
        puzzleUI.resultText = resultText;
        puzzleUI.runButton = runObj.GetComponent<Button>();
        puzzleUI.closeButton = closeObj.GetComponent<Button>();
        puzzleUI.player = player.GetComponent<PlayerController>();

        panel.SetActive(false);

        return canvasObj;
    }

    // =====================================================================
    // UI Text Helpers
    // =====================================================================

    private static Text CreateTopText(DefaultControls.Resources uiResources, Transform parent,
                                       string name, string content, float distanceFromTop, float height, int fontSize)
    {
        GameObject obj = DefaultControls.CreateText(uiResources);
        obj.name = name;
        obj.transform.SetParent(parent, false);
        Text text = obj.GetComponent<Text>();
        text.text = content;
        text.fontSize = fontSize;
        text.color = Color.white;
        text.alignment = TextAnchor.UpperLeft;
        text.horizontalOverflow = HorizontalWrapMode.Wrap;
        text.verticalOverflow = VerticalWrapMode.Overflow;
        RectTransform rect = obj.GetComponent<RectTransform>();
        rect.anchorMin = new Vector2(0f, 1f);
        rect.anchorMax = new Vector2(1f, 1f);
        rect.pivot = new Vector2(0.5f, 1f);
        rect.anchoredPosition = new Vector2(0f, -distanceFromTop);
        rect.sizeDelta = new Vector2(-40f, height);
        return text;
    }

    private static Text CreateBottomText(DefaultControls.Resources uiResources, Transform parent,
                                          string name, string content, float distanceFromBottom, float height, int fontSize)
    {
        GameObject obj = DefaultControls.CreateText(uiResources);
        obj.name = name;
        obj.transform.SetParent(parent, false);
        Text text = obj.GetComponent<Text>();
        text.text = content;
        text.fontSize = fontSize;
        text.color = Color.white;
        text.alignment = TextAnchor.MiddleCenter;
        text.horizontalOverflow = HorizontalWrapMode.Wrap;
        text.verticalOverflow = VerticalWrapMode.Overflow;
        RectTransform rect = obj.GetComponent<RectTransform>();
        rect.anchorMin = new Vector2(0f, 0f);
        rect.anchorMax = new Vector2(1f, 0f);
        rect.pivot = new Vector2(0.5f, 0f);
        rect.anchoredPosition = new Vector2(0f, distanceFromBottom);
        rect.sizeDelta = new Vector2(-40f, height);
        return text;
    }

    private static void WireTerminal(GameObject terminal, GameObject canvas, GameObject door)
    {
        TerminalInteractable interactable = terminal.GetComponent<TerminalInteractable>();
        interactable.mlPuzzleUI = canvas.GetComponent<MLPuzzleUI>();
    }

    // =====================================================================
    // Guard AI & Hiding Spot Builder
    // =====================================================================

    private static void BuildGuardAndHidingSpots(Transform sectionRoot, float labStartZ, LevelTheme theme)
    {
        float labCenterZ = labStartZ + LabLength / 2f;

        // --- Hiding Spots ---
        // Hiding Spot 1: Behind Left Server Racks
        CreateHidingSpot(sectionRoot,
            new Vector3(-LabWidth / 2f + 1.2f, 0.9f, labStartZ + 3.5f),
            new Vector3(1.5f, 1.8f, 2.5f),
            "HidingZone_Servers_Left", theme.accentColor);

        // Hiding Spot 2: Behind Right Server Racks
        CreateHidingSpot(sectionRoot,
            new Vector3(LabWidth / 2f - 1.2f, 0.9f, labStartZ + 7.5f),
            new Vector3(1.5f, 1.8f, 2.5f),
            "HidingZone_Servers_Right", theme.accentColor);

        // Hiding Spot 3: Under / Behind Center Desk
        CreateHidingSpot(sectionRoot,
            new Vector3(-2f, 0.9f, labCenterZ - 1f),
            new Vector3(2.0f, 1.8f, 1.5f),
            "HidingZone_Desk", theme.accentColor);

        // --- Patrol Guard ---
        GameObject guardRoot = new GameObject($"Guard_Patrol_L{theme.level}");
        guardRoot.transform.SetParent(sectionRoot, false);

        // Load 3D Policeman FBX model if available
        GameObject policemanAsset = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Models/policeman-rig.fbx");
        GameObject visualModel;

        if (policemanAsset != null)
        {
            visualModel = (GameObject)PrefabUtility.InstantiatePrefab(policemanAsset, guardRoot.transform);
            visualModel.name = "PolicemanModel";
            visualModel.transform.localPosition = Vector3.zero;
            visualModel.transform.localScale = Vector3.one * 1.0f;
        }
        else
        {
            // Fallback capsule
            visualModel = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            visualModel.name = "GuardModelCapsule";
            visualModel.transform.SetParent(guardRoot.transform, false);
            visualModel.transform.localPosition = new Vector3(0f, 0.9f, 0f);
            visualModel.transform.localScale = new Vector3(0.8f, 0.9f, 0.8f);
            visualModel.GetComponent<Renderer>().material = LabPropFactory.CreateMaterial(new Color(0.1f, 0.15f, 0.3f), 0.5f, 0.4f);
            Object.DestroyImmediate(visualModel.GetComponent<CapsuleCollider>());
        }

        // Add NavMeshAgent
        UnityEngine.AI.NavMeshAgent agent = guardRoot.AddComponent<UnityEngine.AI.NavMeshAgent>();
        agent.speed = 2.2f;
        agent.angularSpeed = 180f;
        agent.acceleration = 8f;
        agent.stoppingDistance = 0.5f;
        agent.radius = 0.4f;
        agent.height = 1.8f;

        // Position guard at first waypoint
        guardRoot.transform.position = new Vector3(2.5f, 0f, labStartZ + 2f);

        // Create Patrol Waypoints
        GameObject waypointsRoot = new GameObject($"Guard_Waypoints_L{theme.level}");
        waypointsRoot.transform.SetParent(sectionRoot, false);

        Vector3[] waypointsPositions = new Vector3[]
        {
            new Vector3(2.5f, 0f, labStartZ + 2f),
            new Vector3(-2.5f, 0f, labStartZ + 5f),
            new Vector3(2.5f, 0f, labStartZ + 8f),
            new Vector3(-2.5f, 0f, labStartZ + 11f)
        };

        Transform[] waypointTransforms = new Transform[waypointsPositions.Length];
        for (int i = 0; i < waypointsPositions.Length; i++)
        {
            GameObject wp = new GameObject($"Waypoint_{i + 1}");
            wp.transform.SetParent(waypointsRoot.transform, false);
            wp.transform.position = waypointsPositions[i];
            waypointTransforms[i] = wp.transform;
        }

        // Add GuardAI script
        GuardAI guardAI = guardRoot.AddComponent<GuardAI>();
        guardAI.waypoints = waypointTransforms;
        guardAI.patrolSpeed = 2.2f;
        guardAI.chaseSpeed = 5.0f;
        guardAI.viewRadius = 9f;
        guardAI.viewAngle = 85f;
        guardAI.hearingRadius = 4f;

        Animator anim = visualModel.GetComponent<Animator>();
        if (anim != null)
        {
            guardAI.animator = anim;
        }
    }

    private static void CreateHidingSpot(Transform parent, Vector3 center, Vector3 size, string name, Color themeAccent)
    {
        GameObject spot = new GameObject(name);
        spot.transform.SetParent(parent, false);
        spot.transform.localPosition = center;

        BoxCollider trigger = spot.AddComponent<BoxCollider>();
        trigger.isTrigger = true;
        trigger.size = size;

        spot.AddComponent<HidingSpot>();

        // Visual stealth zone ground indicator
        GameObject marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
        marker.name = "StealthZoneMarker";
        marker.transform.SetParent(spot.transform, false);
        marker.transform.localPosition = new Vector3(0f, -center.y + 0.02f, 0f);
        marker.transform.localScale = new Vector3(size.x, 0.02f, size.z);

        Color stealthGreen = new Color(0.1f, 0.8f, 0.4f, 0.5f);
        marker.GetComponent<Renderer>().material = LabPropFactory.CreateEmissiveMaterial(stealthGreen, 1.2f);
        Object.DestroyImmediate(marker.GetComponent<Collider>());
    }

    // =====================================================================
    // Mobile Comms Call System & Story Triggers
    // =====================================================================

    private static void EnsureMobileCallSystem(GameObject player)
    {
        // 1. Singleton Manager
        GameObject managerObj = new GameObject("MobileCallManager");
        managerObj.AddComponent<MobileCallManager>();

        // 2. Mobile Call UI Canvas
        BuildMobileCallCanvas();
    }

    private static void BuildMobileCallCanvas()
    {
        var uiResources = new DefaultControls.Resources();

        GameObject canvasObj = new GameObject("Canvas_MobileCallUI");
        Canvas canvas = canvasObj.AddComponent<Canvas>();
        canvas.renderMode = RenderMode.ScreenSpaceOverlay;
        canvas.sortingOrder = 50;
        canvasObj.AddComponent<CanvasScaler>();
        canvasObj.AddComponent<GraphicRaycaster>();

        // Phone Card Container
        GameObject cardObj = new GameObject("PhoneCardContainer");
        cardObj.transform.SetParent(canvasObj.transform, false);
        RectTransform cardRect = cardObj.AddComponent<RectTransform>();
        cardRect.anchorMin = new Vector2(1f, 0f);
        cardRect.anchorMax = new Vector2(1f, 0f);
        cardRect.pivot = new Vector2(1f, 0f);
        cardRect.anchoredPosition = new Vector2(450f, 40f); // default hidden right
        cardRect.sizeDelta = new Vector2(380f, 190f);

        Image cardBg = cardObj.AddComponent<Image>();
        cardBg.color = new Color(0.06f, 0.08f, 0.12f, 0.95f);

        // Header Line
        GameObject headerObj = new GameObject("HeaderAccentLine");
        headerObj.transform.SetParent(cardObj.transform, false);
        RectTransform headerRect = headerObj.AddComponent<RectTransform>();
        headerRect.anchorMin = new Vector2(0f, 1f);
        headerRect.anchorMax = new Vector2(1f, 1f);
        headerRect.pivot = new Vector2(0.5f, 1f);
        headerRect.anchoredPosition = Vector2.zero;
        headerRect.sizeDelta = new Vector2(0f, 4f);
        Image headerImage = headerObj.AddComponent<Image>();
        headerImage.color = new Color(0f, 0.85f, 0.85f);

        // Caller Name
        GameObject nameObj = DefaultControls.CreateText(uiResources);
        nameObj.name = "CallerNameText";
        nameObj.transform.SetParent(cardObj.transform, false);
        Text nameText = nameObj.GetComponent<Text>();
        nameText.text = "Handler Vector";
        nameText.fontSize = 18;
        nameText.fontStyle = FontStyle.Bold;
        nameText.color = Color.white;
        RectTransform nameRect = nameObj.GetComponent<RectTransform>();
        nameRect.anchorMin = new Vector2(0f, 1f);
        nameRect.anchorMax = new Vector2(1f, 1f);
        nameRect.anchoredPosition = new Vector2(15f, -15f);
        nameRect.sizeDelta = new Vector2(250f, 25f);

        // Caller Title
        GameObject titleObj = DefaultControls.CreateText(uiResources);
        titleObj.name = "CallerTitleText";
        titleObj.transform.SetParent(cardObj.transform, false);
        Text titleText = titleObj.GetComponent<Text>();
        titleText.text = "BlackVault Tactical Lead";
        titleText.fontSize = 12;
        titleText.color = new Color(0.7f, 0.75f, 0.8f);
        RectTransform titleRect = titleObj.GetComponent<RectTransform>();
        titleRect.anchorMin = new Vector2(0f, 1f);
        titleRect.anchorMax = new Vector2(1f, 1f);
        titleRect.anchoredPosition = new Vector2(15f, -38f);
        titleRect.sizeDelta = new Vector2(250f, 20f);

        // Status Text
        GameObject statusObj = DefaultControls.CreateText(uiResources);
        statusObj.name = "CallStatusText";
        statusObj.transform.SetParent(cardObj.transform, false);
        Text statusText = statusObj.GetComponent<Text>();
        statusText.text = "INCOMING COMMS CALL...";
        statusText.fontSize = 11;
        statusText.fontStyle = FontStyle.Bold;
        statusText.color = new Color(0f, 0.85f, 0.85f);
        RectTransform statusRect = statusObj.GetComponent<RectTransform>();
        statusRect.anchorMin = new Vector2(0f, 1f);
        statusRect.anchorMax = new Vector2(1f, 1f);
        statusRect.anchoredPosition = new Vector2(15f, -56f);
        statusRect.sizeDelta = new Vector2(250f, 18f);

        // Dialogue Subtitle Box Area
        GameObject dialogueArea = new GameObject("DialogueBoxArea");
        dialogueArea.transform.SetParent(cardObj.transform, false);
        RectTransform dialogueRect = dialogueArea.AddComponent<RectTransform>();
        dialogueRect.anchorMin = new Vector2(0f, 0f);
        dialogueRect.anchorMax = new Vector2(1f, 1f);
        dialogueRect.offsetMin = new Vector2(15f, 45f);
        dialogueRect.offsetMax = new Vector2(-15f, -80f);

        Image dialogueBg = dialogueArea.AddComponent<Image>();
        dialogueBg.color = new Color(0.12f, 0.15f, 0.2f, 0.8f);

        GameObject subObj = DefaultControls.CreateText(uiResources);
        subObj.name = "DialogueSubtitleText";
        subObj.transform.SetParent(dialogueArea.transform, false);
        Text subText = subObj.GetComponent<Text>();
        subText.text = "...";
        subText.fontSize = 12;
        subText.color = new Color(0.9f, 0.92f, 0.95f);
        subText.horizontalOverflow = HorizontalWrapMode.Wrap;
        subText.verticalOverflow = VerticalWrapMode.Truncate;
        RectTransform subRect = subObj.GetComponent<RectTransform>();
        subRect.anchorMin = Vector2.zero;
        subRect.anchorMax = Vector2.one;
        subRect.offsetMin = new Vector2(8f, 5f);
        subRect.offsetMax = new Vector2(-8f, -5f);

        // Buttons
        GameObject answerObj = DefaultControls.CreateButton(uiResources);
        answerObj.name = "AnswerButton";
        answerObj.transform.SetParent(cardObj.transform, false);
        Text answerText = answerObj.GetComponentInChildren<Text>();
        answerText.text = "[T] Answer";
        answerText.fontSize = 12;
        answerText.fontStyle = FontStyle.Bold;
        answerText.color = Color.white;
        answerObj.GetComponent<Image>().color = new Color(0.15f, 0.65f, 0.35f);
        RectTransform answerBtnRect = answerObj.GetComponent<RectTransform>();
        answerBtnRect.anchorMin = new Vector2(0f, 0f);
        answerBtnRect.anchorMax = new Vector2(0f, 0f);
        answerBtnRect.pivot = new Vector2(0f, 0f);
        answerBtnRect.anchoredPosition = new Vector2(15f, 10f);
        answerBtnRect.sizeDelta = new Vector2(160f, 30f);

        GameObject declineObj = DefaultControls.CreateButton(uiResources);
        declineObj.name = "DeclineButton";
        declineObj.transform.SetParent(cardObj.transform, false);
        Text declineText = declineObj.GetComponentInChildren<Text>();
        declineText.text = "[Y] Ignore";
        declineText.fontSize = 12;
        declineText.fontStyle = FontStyle.Bold;
        declineText.color = Color.white;
        declineObj.GetComponent<Image>().color = new Color(0.35f, 0.38f, 0.45f);
        RectTransform declineBtnRect = declineObj.GetComponent<RectTransform>();
        declineBtnRect.anchorMin = new Vector2(1f, 0f);
        declineBtnRect.anchorMax = new Vector2(1f, 0f);
        declineBtnRect.pivot = new Vector2(1f, 0f);
        declineBtnRect.anchoredPosition = new Vector2(-15f, 10f);
        declineBtnRect.sizeDelta = new Vector2(160f, 30f);

        // MobileCallUI component
        MobileCallUI callUI = canvasObj.AddComponent<MobileCallUI>();
        callUI.phoneCardContainer = cardRect;
        callUI.cardBackgroundImage = cardBg;
        callUI.headerAccentLine = headerImage;
        callUI.callerNameText = nameText;
        callUI.callerTitleText = titleText;
        callUI.callStatusText = statusText;
        callUI.dialogueBoxArea = dialogueArea;
        callUI.dialogueSubtitleText = subText;
        callUI.answerButton = answerObj.GetComponent<Button>();
        callUI.declineButton = declineObj.GetComponent<Button>();
        callUI.answerPromptText = answerText;
        callUI.declinePromptText = declineText;

        dialogueArea.SetActive(false);
    }

    private static void BuildStoryCallTriggers(LevelTheme theme, float zOffset, Transform sectionRoot)
    {
        GameObject triggerObj = new GameObject($"CallTriggerZone_L{theme.level}");
        triggerObj.transform.SetParent(sectionRoot, false);
        triggerObj.transform.position = new Vector3(0f, 1.5f, zOffset - 2f);

        BoxCollider box = triggerObj.AddComponent<BoxCollider>();
        box.isTrigger = true;
        box.size = new Vector3(4f, 3f, 2f);

        CallTriggerZone trigger = triggerObj.AddComponent<CallTriggerZone>();
        trigger.callId = $"StoryCall_Sector_{theme.level}";
        trigger.callerName = "Handler Vector";
        trigger.callerTitle = $"BlackVault Overseer — {theme.zoneName}";
        trigger.themeColor = theme.accentColor;

        switch (theme.level)
        {
            case 1:
                trigger.dialogueLines = new string[]
                {
                    "Operative! Can you hear me? This is Handler Vector.",
                    "You've entered Sector 1: Data Processing. Security locks have sealed Door 2.",
                    "Access the terminal ahead, clean the corrupt raw data, and train your model to override the lock!"
                };
                break;

            case 2:
                trigger.dialogueLines = new string[]
                {
                    "Be advised, Operative — Sector 2 is guarded by heavy policeman patrols.",
                    "Stay stealthy! Press [C] to crouch and hide behind server racks when guards walk past.",
                    "Solve the Regression puzzle at the terminal to unlock the main analytics wing."
                };
                break;

            case 3:
                trigger.dialogueLines = new string[]
                {
                    "Warning: Bio-hazard diagnostic containment active in Sector 3.",
                    "Classify patient diagnostic records with 75%+ accuracy to override biometric locks.",
                    "Keep your head down — security guards are patrolling the main lab floor!"
                };
                break;

            case 4:
                trigger.dialogueLines = new string[]
                {
                    "Market Intelligence Sector reached. Firewalls here use unsupervised clustering.",
                    "Apply MinMaxScaler and execute K-Means clustering (K=5) to bypass customer segmentation firewalls."
                };
                break;

            case 5:
                trigger.dialogueLines = new string[]
                {
                    "Financial Security Vault reached. High alert status!",
                    "Deploy anomaly detection models to flag fraud transactions and trigger the main vault escape door!"
                };
                break;
        }
    }
}