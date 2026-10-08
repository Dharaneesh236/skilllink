# SkillLink — AI-Powered Flexible Micro-Employment Platform
> **Tagline:** *"Connecting Skills to Opportunities"*

SkillLink transforms unused personal skills and available free hours into immediate, flexible income. Unlike traditional gig boards where workers passively sift through listings, SkillLink puts **Worker &rarr; Opportunities** at the center of the platform: evaluating skills, exact travel proximity, availability window overlap, customer reviews, and earnings goals through an explainable, pure-Python matching engine.

---

## 🌟 Key Differentiators & Principles

1. **Worker &rarr; Opportunities First-Class:** Recommendations for workers and automated daily earning plans are as prominent as customer hiring.
2. **Zero Hardcoded Data:** 100% of all names, numbers, locations, ratings, and stats are loaded dynamically from user submissions or real-time calculations. Initial form states and empty profiles show zero/empty states.
3. **Pure-Python Matching Engine:** Isolated in `backend/app/matching/engine.py` with zero I/O or network dependencies. Completely deterministic, mathematically explainable, and unit tested.
4. **Honest Simulation & Zero Paid Services:** Runs completely without credit cards or paid APIs. Leaflet with OpenStreetMap tiles, Photon for search-as-you-type, Nominatim for reverse geocoding (with rate limiting and caching), and an OTP-style 4-digit start code for in-person arrival verification.

---

## 🏗️ Architecture & Tech Stack

```
   ┌────────────────────────────────────────────────────────────┐
   │                    Frontend (React 18)                     │
   │      Vite + TypeScript + Tailwind CSS + Lucide Icons       │
   │             Leaflet & OpenStreetMap Visual Maps            │
   └───────────────▲────────────────────────────▲───────────────┘
                   │ HTTP REST (fetch)          │ WebSocket (/ws)
   ┌───────────────▼────────────────────────────▼───────────────┐
   │                   Backend (FastAPI)                        │
   │  Pydantic v2 • SQLAlchemy 2.0 • WebSockets Manager • JWT   │
   └───────────────▲────────────────────────────▲───────────────┘
                   │                            │
   ┌───────────────▼──────────────┐   ┌─────────▼───────────────┐
   │ Pure-Python Matching Engine  │   │  Storage & Caching      │
   │  - 5-Factor Vector Scorer    │   │  - SQLite (Persistent)  │
   │  - Haversine Distance        │   │  - PostgreSQL Ready     │
   │  - Weighted Interval DP Plan │   │  - GeocodeCache Table   │
   └──────────────────────────────┘   └─────────────────────────┘
```

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, Lucide React, Leaflet.
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Uvicorn, WebSockets.
- **Database:** SQLite file by default (`skilllink.db`), dynamic switch to Postgres via `DATABASE_URL`.
- **Real-Time:** Token-authenticated WebSockets (`/ws?token=...`) with exponential backoff and fallback polling.

---

## 🚀 1-Command Local Startup

### Windows (Command Prompt)
```cmd
run.bat
```

### Windows (PowerShell)
```powershell
.\run.ps1
```

### Manual Setup
1. **Backend:**
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
2. **Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev -- --host 127.0.0.1 --port 5173
   ```

- **Frontend URL:** [http://localhost:5173](http://localhost:5173)
- **API Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Live Matching Engine Demo:** [http://localhost:5173/live-engine](http://localhost:5173/live-engine)

---

## 🧮 Matching Engine Formulation

The engine computes a normalized score between **0.0 and 100.0**:

$$\text{Total Score} = \sum_{i} (\text{Raw Factor}_i \times \text{Normalized Weight}_i)$$

### Default Weights (Configurable on Live Demo Page):
- **Skill (40 pts):** Exact match = 1.0; related skill from taxonomy (e.g. `cleaning` $\leftrightarrow$ `household assistance`) = 0.5; mismatch = 0.0.
- **Location (20 pts):** Spherical distance via Haversine: $\max(0, 1 - \frac{\text{dist\_km}}{R})$.
- **Availability (20 pts):** Overlap ratio $\frac{\text{overlap}(J, W)}{\text{duration}(J)}$. Active job conflict sets score to 0.0 with a "schedule conflict" flag.
- **Rating (10 pts):** $\frac{\text{average\_stars}}{5.0}$. Unreviewed workers receive neutral baseline $0.5$ ("New worker").
- **Payment (10 pts):** $\min(1.0, \frac{\text{budget}}{\text{expected\_payment}})$.

### Optimal Earning Plan (Dynamic Programming)
Given a worker's daily goal and target date, the engine applies **Weighted Interval Scheduling** over all eligible jobs, returning the non-overlapping subset that maximizes total potential income.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register customer or worker |
| `POST` | `/auth/login` | Authenticate and obtain JWT |
| `GET` | `/auth/me` | Fetch authenticated user |
| `GET` | `/profile` | Fetch logged-in worker profile |
| `PUT` | `/profile` | Update skills, location, availability, daily goal |
| `GET` | `/jobs` | List open available jobs |
| `POST` | `/jobs` | Post new job (alerts matching workers) |
| `GET` | `/jobs/{id}` | Job details (masks contacts until hired) |
| `POST` | `/jobs/{id}/start` | Worker submits 4-digit start OTP |
| `POST` | `/jobs/{id}/complete`| Customer marks job complete |
| `POST` | `/apply` | Worker applies (computes match breakdown) |
| `GET` | `/applications` | Worker's applications |
| `GET` | `/jobs/{id}/applications` | Customer reviews applicants |
| `POST` | `/accept-job` | Hires worker, generates OTP start code |
| `POST` | `/reject-job` | Rejects application |
| `POST` | `/match` | Pairwise evaluation worker $\leftrightarrow$ job |
| `POST` | `/recommend-jobs` | Ranks available jobs for worker |
| `GET` | `/earning-plan` | DP-computed non-overlapping daily plan |
| `POST` | `/match/preview` | Ad-hoc evaluation for Live Engine demo |
| `POST` | `/reviews` | 1-5 star review for completed jobs |
| `POST` | `/payments` | Records simulated payment |
| `POST` | `/report` & `/block` | Trust & safety reporting and blocking |
| `GET` | `/stats/worker` | Dynamic metrics (earnings, goal %, jobs) |
| `GET` | `/stats/customer` | Dynamic customer metrics |
| `GET` | `/geocode/search` | Search-as-you-type via Photon |
| `GET` | `/geocode/reverse` | Reverse geocoding via Nominatim |
| `WS` | `/ws?token=...` | Live WebSocket event stream |

---

## 🛡️ Trust & Safety Guarantees

- **Arrival OTP Verification:** 4-digit code generated upon hiring. The customer shares this only upon physical arrival to officially start the task.
- **Privacy Obfuscation:** Contact phone numbers and exact job addresses are concealed until hiring is mutually confirmed.
- **Honest Simulations:** Zero-cost architecture labels all platform payments as *"payment recorded (simulated)"*.
- **Review Integrity:** Ratings are derived strictly from genuine reviews; users cannot self-assign ratings.

---

## ☁️ Free-Tier Cloud Deployment

- **Frontend (Vercel):** Pre-configured with `vercel.json` SPA routing. Set `VITE_API_URL` to the backend URL.
- **Backend (Render):** Deploy using `render.yaml` or `Dockerfile`. Supports free-tier PostgreSQL via `DATABASE_URL`.
- **Single-Service Mode:** When `frontend/dist` is built, FastAPI automatically serves the SPA bundle at `/`.
