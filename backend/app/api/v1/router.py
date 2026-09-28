"""
backend/app/api/v1/router.py
Master API v1 Router aggregating all domain sub-routers.
"""

from fastapi import APIRouter

from backend.app.api.v1.wells import router as wells_router
from backend.app.api.v1.simulation import router as simulation_router
from backend.app.api.v1.analytics import router as analytics_router
from backend.app.api.v1.forecast import router as forecast_router
from backend.app.api.v1.scenarios import router as scenarios_router
from backend.app.api.v1.optimization import router as optimization_router
from backend.app.api.v1.recommendations import router as recommendations_router
from backend.app.api.v1.assurance import router as assurance_router
from backend.app.api.v1.alerts import router as alerts_router
from backend.app.api.v1.websocket import router as websocket_router
from backend.app.api.v1.calibration import router as calibration_router  # H2 fix
from backend.app.api.v1.reports import router as reports_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(wells_router)
api_v1_router.include_router(simulation_router)
api_v1_router.include_router(analytics_router)
api_v1_router.include_router(forecast_router)
api_v1_router.include_router(scenarios_router)
api_v1_router.include_router(optimization_router)
api_v1_router.include_router(recommendations_router)
api_v1_router.include_router(assurance_router)
api_v1_router.include_router(alerts_router)
api_v1_router.include_router(websocket_router)
api_v1_router.include_router(calibration_router)  # H2 fix — was imported but not registered
api_v1_router.include_router(reports_router)
