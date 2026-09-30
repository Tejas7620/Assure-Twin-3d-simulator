# =============================================================================
# ASSURE-TWIN Unified Production Dockerfile (Multi-Stage Build)
# SIH 2026 — PS 26120: Digital Twin for CSS & SRP Operations in Heavy Oil
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Build Frontend (Vite + TypeScript + Three.js)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Install dependencies cleanly
COPY package*.json ./
RUN npm ci

# Copy frontend application files and compile
COPY tsconfig.json index.html ./
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production Python Backend + Static Hosting
# -----------------------------------------------------------------------------
FROM python:3.13-slim AS runner

WORKDIR /app

# Install minimal OS dependencies for compilation and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy compiled frontend assets from Stage 1 into /app/dist
COPY --from=frontend-builder /app/dist ./dist

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Healthcheck endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Seed foundational data if empty and launch FastAPI / Uvicorn server
CMD ["sh", "-c", "python -m backend.app.seed && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
