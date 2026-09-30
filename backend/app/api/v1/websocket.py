"""
backend/app/api/v1/websocket.py
High-Frequency Real-Time WebSocket Telemetry Stream (10-20 Hz).
Broadcasts kinematics, dyno cards, downhole thermodynamics, and surface production to connected digital twin clients.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import json
from typing import Set

from backend.app.simulation.manager import get_sim_engine

router = APIRouter(tags=["WebSocket"])

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

@router.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    sim = get_sim_engine()
    last_time = asyncio.get_event_loop().time()
    
    try:
        while True:
            # Check for client messages non-blocking
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.05)
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
            
            # Step physics simulation
            current_time = asyncio.get_event_loop().time()
            dt = min(0.1, max(0.01, current_time - last_time))
            last_time = current_time
            
            state = sim.step(dt)
            await websocket.send_json({
                "type": "telemetry",
                "timestamp": current_time,
                "data": state
            })
            
            await asyncio.sleep(0.05) # ~20 Hz streaming
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@router.websocket("/ws/wells/{well_id}")
async def websocket_well_endpoint(websocket: WebSocket, well_id: str):
    await manager.connect(websocket)
    sim = get_sim_engine()
    last_time = asyncio.get_event_loop().time()
    
    try:
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.05)
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
            
            current_time = asyncio.get_event_loop().time()
            dt = min(0.1, max(0.01, current_time - last_time))
            last_time = current_time
            
            state = sim.step(dt)
            await websocket.send_json({
                "type": "well_state_update",
                "well_id": well_id,
                "timestamp": current_time,
                "data": state
            })
            
            await asyncio.sleep(0.05)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

