// LevelMapData.cs — BlackVault Unity Map Data Container
using System;
using System.Collections.Generic;
using UnityEngine;

namespace BlackVault.Map
{
    public enum SectorStatus
    {
        Sealed,
        Unlocked,
        Active,
        Alert
    }

    [Serializable]
    public class DoorNodeData
    {
        public string doorId;
        public string targetSectorId;
        public string targetNodeId;
        public SectorStatus status = SectorStatus.Sealed;
        public int clearanceRequired = 1;
    }

    [Serializable]
    public class TerminalNodeData
    {
        public string nodeId;
        public string terminalId;
        public string name;
        public int levelNumber;
        public string dataset;
        public string problemType;
        public Vector3 localPosition;
    }

    [CreateAssetMenu(fileName = "LevelMapData", menuName = "BlackVault/Level Map Data")]
    public class LevelMapData : ScriptableObject
    {
        [Header("Sector Identification")]
        public string sectorId = "SEC_01";
        public string sectorName = "Data Core";
        public int levelNumber = 1;
        public int clearanceLevel = 1;
        public SectorStatus initialStatus = SectorStatus.Sealed;

        [Header("Coordinates & Visuals")]
        public Vector3 sectorCoordinates;
        public Color sectorThemeColor = Color.cyan;
        public string environmentalHazard = "Sparks & Corrupt Data Stream";

        [Header("Terminals & Security Doors")]
        public List<TerminalNodeData> terminals = new List<TerminalNodeData>();
        public List<DoorNodeData> doors = new List<DoorNodeData>();
    }
}
