# BlackVault — ML Escape Lab

A browser-based 3D game where you solve real Machine Learning challenges behind 5 doors in a high-tech lab facility. Level-based progression with 1–3 star ratings.

## Quick Start

### Backend
```bash
cd backend
pip install -r requirements.txt
python main.py
```
Server runs on `http://localhost:8000`

### Frontend
```bash
cd frontend
npm install
npx vite
```
Open `http://localhost:5173` in your browser.

## Game Controls
- **WASD** — Move
- **Mouse** — Look around
- **Click** — Interact with doors
- **ESC** — Pause / Release cursor

## Tech Stack
- **Frontend**: Three.js, Howler.js, Vite
- **Backend**: Python, FastAPI, scikit-learn, SQLite
