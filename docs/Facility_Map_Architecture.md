# 🏢 BlackVault Master Facility Map Architecture & Layout Specification

## 1. Executive Facility Overview

The **BlackVault Research & Security Complex** is an underground, high-security facility divided into **6 Interconnected Sectors**. The facility security system operates on automated ML firewalls, requiring operatives to solve data science challenges at security terminals to unlock doors, disarm environmental hazard locks, and progress deeper toward the Central AI Core.

```
       [Sector 00: Mission Hub / Surface Airlock]
                           │
                           ▼
       [Sector 01: Data Core (House Prices)]
                           │
                           ▼
       [Sector 02: Processing Vault (Regression)]
                           │
                           ▼
       [Sector 03: Neural Lab (Classification)]
                           │
                           ▼
       [Sector 04: Cluster Node (Clustering)]
                           │
                           ▼
       [Sector 05: Anomaly Containment (Fraud Monitor)]
                           │
                           ▼
       [Sector 06: Central AI Core (Boss Room)]
```

---

## 2. Sector Specification Breakdown

### Sector 00: Surface Command & Mission Hub
- **Purpose**: Player spawn, briefing visual displays, holographic map table, squad selection, mission replay.
- **Coordinates**: $(X: 0, Y: 0, Z: 0)$
- **Clearance Level**: 0 (Public Operative Zone)
- **Key Terminals**:
  - `TERM_HUB_01`: Main Tactical Map Display
  - `TERM_HUB_02`: Squad Roster & Radio Chatter
- **Connected Rooms**: North to Sector 01 Airlock.

### Sector 01: Data Core (Data Preprocessing Vault)
- **Purpose**: Raw data ingestion & cleaning hub. Corrupt dataset streams must be sanitized.
- **Coordinates**: $(X: 0, Y: 50, Z: 0)$
- **Target Dataset**: `house_prices` (Raw dirty CSV)
- **Clearance Level**: 1 (Data Technician)
- **Terminals**:
  - `TERM_L1_PREPROCESS`: Controls primary hydraulic airlock door (`DOOR_SEC_01`)
- **Hazards**: High-voltage cable sparks, data stream corruption noise.

### Sector 02: Processing Vault (Regression Sector)
- **Purpose**: Continuous metric calibration & model fitting facility.
- **Coordinates**: $(X: 100, Y: 50, Z: 0)$
- **Target Dataset**: `house_prices` continuous regression targets
- **Clearance Level**: 2 (Model Calibration Specialist)
- **Terminals**:
  - `TERM_L2_REGRESSION`: Controls pressure containment gate (`DOOR_SEC_02`)
- **Hazards**: Overheating server racks.

### Sector 03: Neural Lab (Classification Facility)
- **Purpose**: Biometric & medical signal classification lab.
- **Coordinates**: $(X: 100, Y: 120, Z: 0)$
- **Target Dataset**: `heart_disease` binary classification
- **Clearance Level**: 3 (Neural Array Analyst)
- **Terminals**:
  - `TERM_L3_CLASSIFY`: Controls bio-hazard blast door (`DOOR_SEC_03`)
- **Hazards**: Cryogenic cooling vapors.

### Sector 04: Cluster Node (Unsupervised Pattern Vault)
- **Purpose**: High-dimensional spatial clustering and behavioral group analysis.
- **Coordinates**: $(X: 0, Y: 120, Z: 0)$
- **Target Dataset**: `mall_customers` 5-cluster segmentation
- **Clearance Level**: 4 (Cluster Systems Architect)
- **Terminals**:
  - `TERM_L4_CLUSTER`: Controls quantum manifold lock (`DOOR_SEC_04`)
- **Hazards**: Laser grid sensors.

### Sector 05: Anomaly Containment (Fraud & Outlier Vault)
- **Purpose**: High-security perimeter monitoring real-time intrusion flags.
- **Coordinates**: $(X: -100, Y: 120, Z: 0)$
- **Target Dataset**: `credit_card` fraud detection
- **Clearance Level**: 5 (Security Threat Sentinel)
- **Terminals**:
  - `TERM_L5_ANOMALY`: Controls quarantine bulkhead (`DOOR_SEC_05`)
- **Hazards**: Auto-turret targeting sweeps.

### Sector 06: Central AI Core (Boss Sandbox Chamber)
- **Purpose**: Central facility AI chamber running dynamic procedural dataset security.
- **Coordinates**: $(X: 0, Y: 200, Z: 0)$
- **Target Dataset**: `boss_dataset` procedural hidden structure
- **Clearance Level**: 6 (Master Administrator / Rogue Operative)
- **Terminals**:
  - `TERM_BOSS_SANDBOX`: Unlocks main facility escape capsule (`DOOR_MAIN_ESCAPE`)
- **Hazards**: Full facility lockdown timer & neural feedback matrix.

---

## 3. Data Schema & Network Topology

```json
{
  "facility_id": "BLACKVAULT_ALPHA",
  "sectors": [
    {
      "sector_id": "SEC_00",
      "name": "Mission Hub",
      "level_number": 0,
      "unlocked": true,
      "position": {"x": 0, "y": 0, "z": 0},
      "doors": ["DOOR_HUB_01"],
      "terminals": ["TERM_HUB_01", "TERM_HUB_02"]
    },
    {
      "sector_id": "SEC_01",
      "name": "Data Core",
      "level_number": 1,
      "unlocked": true,
      "position": {"x": 0, "y": 50, "z": 0},
      "doors": ["DOOR_SEC_01"],
      "terminals": ["TERM_L1_PREPROCESS"]
    }
  ]
}
```
