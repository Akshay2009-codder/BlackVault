// FacilityMapBuilder.cs — Unity Editor Tool for Master Facility Map Construction
using UnityEditor;
using UnityEngine;
using BlackVault.Map;
using BlackVault.Interaction;

namespace BlackVault.EditorTools
{
    public static class FacilityMapBuilder
    {
        [MenuItem("BlackVault/Build Whole Facility Master Map Scene")]
        public static void BuildMasterFacilityMap()
        {
            GameObject masterRoot = new GameObject("--- MASTER FACILITY MAP ---");

            // Build Sectors
            GameObject hub = CreateSectorRoom("Sector_00_MissionHub", new Vector3(0, 0, 0), new Vector3(25, 6, 25), Color.blue);
            GameObject s1 = CreateSectorRoom("Sector_01_DataCore", new Vector3(0, 0, 40), new Vector3(20, 6, 20), Color.cyan);
            GameObject s2 = CreateSectorRoom("Sector_02_ProcessingVault", new Vector3(35, 0, 40), new Vector3(20, 6, 20), Color.green);
            GameObject s3 = CreateSectorRoom("Sector_03_NeuralLab", new Vector3(35, 0, 80), new Vector3(20, 6, 20), Color.magenta);
            GameObject s4 = CreateSectorRoom("Sector_04_ClusterNode", new Vector3(0, 0, 80), new Vector3(20, 6, 20), Color.yellow);
            GameObject s5 = CreateSectorRoom("Sector_05_AnomalyContainment", new Vector3(-35, 0, 80), new Vector3(20, 6, 20), Color.red);
            GameObject s6 = CreateSectorRoom("Sector_06_CentralAICore", new Vector3(0, 0, 130), new Vector3(30, 8, 30), Color.white);

            hub.transform.SetParent(masterRoot.transform);
            s1.transform.SetParent(masterRoot.transform);
            s2.transform.SetParent(masterRoot.transform);
            s3.transform.SetParent(masterRoot.transform);
            s4.transform.SetParent(masterRoot.transform);
            s5.transform.SetParent(masterRoot.transform);
            s6.transform.SetParent(masterRoot.transform);

            BuildSector1DataCoreDetails(s1);
            BuildSector2ProcessingVaultDetails(s2);
            BuildSector3NeuralLabDetails(s3);
            BuildSector4ClusterNodeDetails(s4);
            BuildSector5AnomalyContainmentDetails(s5);
            BuildSector6CentralAICoreDetails(s6);

            // Connect Corridor Halls





            CreateCorridor("Corridor_Hub_S1", new Vector3(0, 0, 20), new Vector3(6, 4, 15)).transform.SetParent(masterRoot.transform);
            CreateCorridor("Corridor_S1_S2", new Vector3(17.5f, 0, 40), new Vector3(15, 4, 6)).transform.SetParent(masterRoot.transform);
            CreateCorridor("Corridor_S2_S3", new Vector3(35, 0, 60), new Vector3(6, 4, 15)).transform.SetParent(masterRoot.transform);
            CreateCorridor("Corridor_S3_S4", new Vector3(17.5f, 0, 80), new Vector3(15, 4, 6)).transform.SetParent(masterRoot.transform);
            CreateCorridor("Corridor_S4_S5", new Vector3(-17.5f, 0, 80), new Vector3(15, 4, 6)).transform.SetParent(masterRoot.transform);
            CreateCorridor("Corridor_S4_S6", new Vector3(0, 0, 105), new Vector3(6, 4, 20)).transform.SetParent(masterRoot.transform);

            Debug.Log("[FacilityMapBuilder] Complete Master Facility Map layout assembled successfully.");
        }

        private static GameObject CreateSectorRoom(string name, Vector3 pos, Vector3 size, Color theme)
        {
            GameObject room = new GameObject(name);
            room.transform.position = pos;

            // Floor
            GameObject floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "Floor";
            floor.transform.SetParent(room.transform);
            floor.transform.localPosition = new Vector3(0, -0.5f, 0);
            floor.transform.localScale = new Vector3(size.x, 1, size.z);

            // Light
            GameObject lightObj = new GameObject("SectorLight");
            lightObj.transform.SetParent(room.transform);
            lightObj.transform.localPosition = new Vector3(0, size.y - 1, 0);
            Light light = lightObj.AddComponent<Light>();
            light.type = LightType.Point;
            light.color = theme;
            light.range = size.x * 1.2f;
            light.intensity = 2.0f;

            return room;
        }

        private static GameObject CreateCorridor(string name, Vector3 pos, Vector3 size)
        {
            GameObject corridor = new GameObject(name);
            corridor.transform.position = pos;

            GameObject floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "CorridorFloor";
            floor.transform.SetParent(corridor.transform);
            floor.transform.localPosition = new Vector3(0, -0.5f, 0);
            floor.transform.localScale = new Vector3(size.x, 1, size.z);

            return corridor;
        }

        private static void BuildSector1DataCoreDetails(GameObject s1)
        {
            // Terminal Stand
            GameObject termStand = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            termStand.name = "TERM_L1_PREPROCESS_PEDESTAL";
            termStand.transform.SetParent(s1.transform);
            termStand.transform.localPosition = new Vector3(0, 0.75f, 5);
            termStand.transform.localScale = new Vector3(1.2f, 0.75f, 1.2f);

            // Server Racks flanking walls
            for (int i = -6; i <= 6; i += 4)
            {
                GameObject rackL = GameObject.CreatePrimitive(PrimitiveType.Cube);
                rackL.name = $"ServerRack_L_{i}";
                rackL.transform.SetParent(s1.transform);
                rackL.transform.localPosition = new Vector3(-8.5f, 2.5f, i);
                rackL.transform.localScale = new Vector3(1.5f, 5, 2.5f);

                GameObject rackR = GameObject.CreatePrimitive(PrimitiveType.Cube);
                rackR.name = $"ServerRack_R_{i}";
                rackR.transform.SetParent(s1.transform);
                rackR.transform.localPosition = new Vector3(8.5f, 2.5f, i);
                rackR.transform.localScale = new Vector3(1.5f, 5, 2.5f);
            }
        }

        private static void BuildSector2ProcessingVaultDetails(GameObject s2)
        {
            GameObject termPedestal = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            termPedestal.name = "TERM_L2_REGRESSION_PEDESTAL";
            termPedestal.transform.SetParent(s2.transform);
            termPedestal.transform.localPosition = new Vector3(0, 0.75f, 0);
            termPedestal.transform.localScale = new Vector3(1.5f, 0.75f, 1.5f);

            GameObject heatVent = GameObject.CreatePrimitive(PrimitiveType.Cube);
            heatVent.name = "HeatExchanger_Vent";
            heatVent.transform.SetParent(s2.transform);
            heatVent.transform.localPosition = new Vector3(0, 4.5f, 0);
            heatVent.transform.localScale = new Vector3(6, 1.5f, 6);
        }

        private static void BuildSector3NeuralLabDetails(GameObject s3)
        {
            GameObject termStand = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            termStand.name = "TERM_L3_CLASSIFY_PEDESTAL";
            termStand.transform.SetParent(s3.transform);
            termStand.transform.localPosition = new Vector3(0, 0.75f, 0);
            termStand.transform.localScale = new Vector3(1.4f, 0.75f, 1.4f);

            for (int i = 0; i < 4; i++)
            {
                float angle = i * Mathf.PI / 2.0f;
                Vector3 cryoPos = new Vector3(Mathf.Cos(angle) * 7.0f, 2.0f, Mathf.Sin(angle) * 7.0f);
                GameObject cryoPod = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                cryoPod.name = $"CryoPod_{i}";
                cryoPod.transform.SetParent(s3.transform);
                cryoPod.transform.localPosition = cryoPos;
                cryoPod.transform.localScale = new Vector3(1.2f, 2.2f, 1.2f);
            }
        }

        private static void BuildSector4ClusterNodeDetails(GameObject s4)
        {
            GameObject clusterNode = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            clusterNode.name = "QuantumClusterNode_Core";
            clusterNode.transform.SetParent(s4.transform);
            clusterNode.transform.localPosition = new Vector3(0, 3.0f, 0);
            clusterNode.transform.localScale = new Vector3(3, 3, 3);
        }

        private static void BuildSector5AnomalyContainmentDetails(GameObject s5)
        {
            GameObject forcefield = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            forcefield.name = "AnomalyForcefieldRing";
            forcefield.transform.SetParent(s5.transform);
            forcefield.transform.localPosition = new Vector3(0, 2.5f, 0);
            forcefield.transform.localScale = new Vector3(8, 2.5f, 8);
        }

        private static void BuildSector6CentralAICoreDetails(GameObject s6)
        {
            GameObject aiCoreSphere = GameObject.CreatePrimitive(PrimitiveType.Sphere);
            aiCoreSphere.name = "BLACKVAULT_AI_CORE_SPHERE";
            aiCoreSphere.transform.SetParent(s6.transform);
            aiCoreSphere.transform.localPosition = new Vector3(0, 5.0f, 0);
            aiCoreSphere.transform.localScale = new Vector3(6, 6, 6);

            GameObject bossTerminalPedestal = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
            bossTerminalPedestal.name = "TERM_BOSS_SANDBOX_PEDESTAL";
            bossTerminalPedestal.transform.SetParent(s6.transform);
            bossTerminalPedestal.transform.localPosition = new Vector3(0, 0.75f, -8);
            bossTerminalPedestal.transform.localScale = new Vector3(2, 0.75f, 2);
        }
    }
}





