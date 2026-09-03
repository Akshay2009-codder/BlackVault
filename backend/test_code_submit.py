import httpx

BASE = 'http://localhost:8000/api/challenges'

# Step 1: Start challenge
r1 = httpx.post(f'{BASE}/start', json={'player_id': 1, 'level': 1, 'door_type': 'cleaning'})
print('Start:', r1.status_code, r1.json().get('target_metric'))

# Step 2: Submit with code only (no actions)
code = "import pandas as pd\ndf = dataset.copy()\ndf = df.drop_duplicates()\ndf['age'] = df['age'].fillna(df['age'].mean())\ndf['salary'] = df['salary'].fillna(df['salary'].mean())\ndf = df[df['salary'] <= 500000]\ndf['age'] = df['age'].astype(float)"

r2 = httpx.post(f'{BASE}/submit', json={
    'player_id': 1, 'level': 1, 'door_type': 'cleaning',
    'actions': [], 'time_taken': 30.0, 'code': code
})
j2 = r2.json()
print('Submit:', r2.status_code)
print('Stars:', j2.get('stars'), '| Score:', j2.get('score'), '| Success:', j2.get('success'))
print('Message:', j2.get('message'))
