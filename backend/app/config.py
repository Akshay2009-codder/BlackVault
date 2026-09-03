"""Global backend config -- ports, DB path, CORS origins."""

DB_PATH = "blackvault.db"
CORS_ORIGINS = ["*"]

# Door/puzzle type keys used throughout the backend + frontend contract.
DOOR_TYPES = ["classification", "regression", "clustering", "anomaly"]
BOSS_DOOR_TYPE = "mystery"
