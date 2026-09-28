"""
backend/app/main.py
Main FastAPI Application Entrypoint for ASSURE-TWIN.
SIH 2026 — Problem Statement 26120: Digital Twin for CSS & SRP Operations in Heavy Oil Fields.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.api.v1.router import api_v1_router
from backend.app.simulation.manager import get_sim_engine

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB tables and seed foundational data if empty
    print("[ASSURE-TWIN] Initializing Database Schema...")
    init_db()
    print("[ASSURE-TWIN] Starting Physics Simulation Engine...")
    sim = get_sim_engine()
    sim.step(0.01)
    print(f"[ASSURE-TWIN] Engine Initialized at Day {sim.sim_time_days}, Temp {sim.thermal_model.near_well_temp_c} C")
    yield
    print("[ASSURE-TWIN] Shutting down simulation services.")

app = FastAPI(
    title="ASSURE-TWIN Petroleum Engineering Digital Twin API",
    description="Decisive Production Optimization & Zero-Trust Assurance Platform for Cyclic Steam Stimulation & Sucker Rod Pumping in Heavy Oil Wells (Baghewala Field, Rajasthan). SIH 2026 — PS 26120.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Frontend Vite and local clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register master API v1 router
app.include_router(api_v1_router)

@app.get("/health", tags=["Health"])
def health_check():
    sim = get_sim_engine()
    return {
        "status": "HEALTHY",
        "service": "ASSURE-TWIN Backend",
        "problem_statement": "SIH 2026 - PS 26120",
        "asset": "Baghewala Heavy Oil Field (Well BGW-17A)",
        "sim_time_days": round(sim.sim_time_days, 1),
        "css_phase": sim.css_phase,
        "active_scenario": sim.active_scenario,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import json

@app.websocket("/ws/sim")
async def ws_sim_endpoint(websocket: WebSocket):
    await websocket.accept()
    sim = get_sim_engine()
    last_t = asyncio.get_event_loop().time()
    try:
        while True:
            # Check for client messages non-blocking
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.03)
                msg = json.loads(data)
                action = msg.get("action")
                param = msg.get("param")
                val = msg.get("value")
                if action == "control" and param:
                    sim.set_control(param, val)
                elif action == "reset":
                    sim.sim_time_days = 30.0
                    sim.spm = 3.2
                    sim.stroke_inches = 64.0
            except asyncio.TimeoutError:
                pass
            
            cur_t = asyncio.get_event_loop().time()
            dt = min(0.08, max(0.01, cur_t - last_t))
            last_t = cur_t
            
            state = sim.step(dt)
            await websocket.send_json(state)
            await asyncio.sleep(0.04) # ~25 Hz update rate
    except WebSocketDisconnect:
        pass
    except Exception:
        pass

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "InternalServerError",
            "detail": str(exc),
            "path": request.url.path
        }
    )
