"""
main.py
FastAPI + WebSocket server for ASSURE-TWIN 3D Petroleum Production Simulation Engine.
Publishes authoritative state to 3D client and handles real-time control events.
"""

import asyncio
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Set, Any

from .engine import SimulationEngine

app = FastAPI(title="ASSURE-TWIN Simulation Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engine = SimulationEngine()

# Active WebSocket client connections
connected_clients: Set[WebSocket] = set()

class ControlRequest(BaseModel):
    param: str
    value: Any

@app.get("/")
def read_root():
    return {"status": "ONLINE", "system": "ASSURE-TWIN Petroleum Simulation Engine"}

@app.get("/api/state")
def get_state():
    return engine._last_state

@app.post("/api/control")
def set_control(req: ControlRequest):
    engine.set_control(req.param, req.value)
    return {"status": "SUCCESS", "param": req.param, "value": req.value}

@app.post("/api/demo/{demo_name}")
def trigger_demo(demo_name: str):
    if demo_name == "physics_demo":
        engine.start_physics_demo()
    elif demo_name == "spm_experiment":
        engine.start_spm_experiment()
    return {"status": "TRIGGERED", "demo": demo_name}

@app.websocket("/ws/sim")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            # Receive client messages / commands
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")
                if msg_type == "SET_CONTROL":
                    engine.set_control(msg.get("param"), msg.get("value"))
                elif msg_type == "TRIGGER_DEMO":
                    demo = msg.get("demo")
                    if demo == "physics_demo":
                        engine.start_physics_demo()
                    elif demo == "spm_experiment":
                        engine.start_spm_experiment()
            except Exception as e:
                print(f"Error parsing client message: {e}")
    except WebSocketDisconnect:
        connected_clients.discard(websocket)

# Background simulation broadcast task (10 Hz)
async def simulation_loop():
    last_time = asyncio.get_event_loop().time()
    while True:
        await asyncio.sleep(0.08) # ~12.5 Hz update rate
        now = asyncio.get_event_loop().time()
        dt = max(0.01, min(0.2, now - last_time))
        last_time = now

        # Step physics engine
        state = engine.step(dt)

        # Broadcast state to all connected 3D frontend clients
        if connected_clients:
            payload = json.dumps(state)
            disconnected = set()
            for ws in connected_clients:
                try:
                    await ws.send_text(payload)
                except Exception:
                    disconnected.add(ws)
            connected_clients.difference_update(disconnected)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(simulation_loop())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
