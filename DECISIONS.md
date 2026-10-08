# SkillLink - Architectural and Technical Decisions (DECISIONS.md)

This document tracks all design decisions, trade-offs, and deviations made during the development of SkillLink.

---

## 1. Multi-User Realtime Architecture
- **Decision**: SQLite by default for zero-setup local persistence, with SQLAlchemy 2.0 and dynamic connection pooling. Configurable `DATABASE_URL` supports free-tier PostgreSQL (Supabase, Render, Neon).
- **Realtime**: Implemented token-authenticated FastAPI WebSockets (`/ws?token=...`) with an in-memory `ConnectionManager`. If WebSocket disconnects, frontend employs exponential backoff and transparently falls back to periodic polling.
- **Rationale**: Removes external cloud account dependencies while guaranteeing true cross-user live event delivery between workers and customers.

## 2. Dynamic Computed Ratings (No Self-Reported Ratings)
- **Decision**: Worker ratings are strictly calculated as the average of actual reviews from customers (`Review` table). If a worker has 0 reviews, they receive a neutral factor score of 0.5 (labeled "New worker") so newcomers are never penalized.
- **Rationale**: Self-entered ratings at registration destroy platform trust and violate Immutable Rule #2 (no fake data).

## 3. Pure-Python Matching Engine Isolation
- **Decision**: Located in `backend/app/matching/engine.py` as a standalone module without any database models or I/O.
- **Rationale**: Guarantees deterministic, fast mathematical computations, enables 100% test coverage with unit tests, and allows running ad-hoc previews without touching the database.

## 4. Location and Geocoding Strategy (Zero-Cost & Policy-Compliant)
- **Decision**:
  1. Leaflet + OpenStreetMap tiles with open attribution.
  2. Search-as-you-type: Photon by Komoot (`photon.komoot.io`), debounced at 350ms, cached locally.
  3. Reverse geocoding & submit search: OpenStreetMap Nominatim with strict identifying `User-Agent` header, rate-limited to <= 1 req/sec, cached in the database `GeocodeCache` table.
  4. Distance: Pure Python Haversine formula (instant, offline, zero API).
  5. Privacy: Exact coordinates are obfuscated (~1 km precision) until a job application is accepted.
- **Rationale**: Complies with Nominatim usage policy (which forbids rapid search-as-you-type) and strictly complies with the Zero-Cost Rule (no Google Maps API).

## 5. Optimal Earning Plan (Weighted Interval Scheduling)
- **Decision**: Implemented dynamic programming for Weighted Interval Scheduling over eligible jobs on a given date.
- **Rationale**: Ensures a worker's daily schedule has zero overlapping job conflicts while maximizing total payout towards their daily earning goal.

## 6. Trust & Safety Measures
- **Decision**: 4-digit numeric start code generated upon job assignment. The customer provides this to the worker upon physical arrival; worker submits the code to shift the job to `in_progress`.
- **Rationale**: Simple, zero-cost OTP-style handshake eliminating the need for paid SMS gateways (Twilio).

## 7. AI Transparency
- **Decision**: Core matching is explicitly labeled as explainable algorithmic scoring. The term "AI" is reserved exclusively for optional Groq LLM enhancements (such as job description generation or plain-text reasoning summaries) when `GROQ_API_KEY` is present.
