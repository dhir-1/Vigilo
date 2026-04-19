from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
import app.models  # Ensures all models and relationships are registered on boot

settings = get_settings()

app = FastAPI(
    title="Vigilo - CrimeSafe AI",
    description="Crime mapping and safety intelligence platform for Surat",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.routes import auth, crimes, reports, admin, navigation, safety, sos, contacts, public, ws_alerts, users, saved_locations

app.include_router(auth.router)
app.include_router(crimes.router)
app.include_router(reports.router)
app.include_router(admin.router)
app.include_router(navigation.router)
app.include_router(safety.router)
app.include_router(sos.router)
app.include_router(contacts.router)
app.include_router(saved_locations.router)
app.include_router(public.router)
app.include_router(ws_alerts.router)
app.include_router(users.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Vigilo API is running"}


@app.get("/")
async def root():
    return {
        "app": "Vigilo - CrimeSafe AI",
        "version": "1.0.0",
        "docs": "/docs",
    }

