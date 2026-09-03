"""Global backend config -- ports, DB path, CORS origins."""

DB_PATH = "blackvault.db"
CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5500"]

# Door/puzzle type keys used throughout the backend + frontend contract.
DOOR_TYPES = ["classification", "regression", "clustering", "anomaly"]
BOSS_DOOR_TYPE = "mystery"
