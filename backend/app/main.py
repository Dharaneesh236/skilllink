"""SkillLink FastAPI Application Main Entrypoint"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.database import engine, Base
import app.models  # Ensure all SQLAlchemy models are registered
from app.auth.router import router as auth_router
from app.routers.workers import router as workers_router
from app.routers.jobs import router as jobs_router
from app.routers.applications import router as applications_router
from app.matching.router import router as matching_router
from app.routers.reviews import router as reviews_router
from app.routers.notifications import router as notifications_router
from app.routers.payments import router as payments_router
from app.routers.trust import router as trust_router
from app.routers.stats import router as stats_router
from app.routers.geocode import router as geocode_router
from app.websocket.router import router as ws_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create all database tables on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SkillLink API",
    description="Backend API for SkillLink - AI-Powered Flexible Micro-Employment Platform",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth_router)
app.include_router(workers_router)
app.include_router(jobs_router)
app.include_router(applications_router)
app.include_router(matching_router)
app.include_router(reviews_router)
app.include_router(notifications_router)
app.include_router(payments_router)
app.include_router(trust_router)
app.include_router(stats_router)
app.include_router(geocode_router)
app.include_router(ws_router)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SkillLink Micro-Employment API",
        "version": "1.0.0",
        "groq_enabled": bool(settings.GROQ_API_KEY)
    }


# Static frontend hosting if built dist exists (for single-service deployment)
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(frontend_dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist_path, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))
