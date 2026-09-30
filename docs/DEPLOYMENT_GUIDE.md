# ASSURE-TWIN — Production Deployment Guide
**SIH 2026 — Problem Statement 26120: Digital Twin for CSS & SRP Operations in Heavy Oil Fields**

---

## 1. Architecture Overview for Deployment

The ASSURE-TWIN platform is designed for flexible zero-downtime deployment in two primary topologies:

| Deployment Mode | Description | Recommended Hosting |
| :--- | :--- | :--- |
| **Unified Single Container** *(Recommended)* | The root [Dockerfile](../Dockerfile) compiles the Vite/TypeScript 3D frontend into `/app/dist` and serves both the REST API, WebSocket streams (`/ws/sim`), and 3D visualizer from a single port. Zero CORS complexity. | **Render, Railway, Fly.io, AWS App Runner, Google Cloud Run, Docker Compose** |
| **Decoupled Client-Server** | Frontend static files (`dist/`) hosted on a CDN / static host; FastAPI backend runs as an API service. Configured via `VITE_API_URL` and `VITE_WS_URL`. | **Vercel / Netlify / Cloudflare Pages + Render / EC2 Backend** |

---

## 2. Option A: 1-Click Docker Deployment (Single Container)

### Local Docker Run
Build and run the production image locally:
```bash
# 1. Build the production multi-stage container
docker build -t assure-twin:latest .

# 2. Run container (mapped to host port 8000)
docker run -d --name assure-twin -p 8000:8000 assure-twin:latest
```
Open **`http://localhost:8000`** in your browser:
- `http://localhost:8000/` &rarr; Industrial 3D Visualizer & Workstation UI
- `http://localhost:8000/api/v1/...` &rarr; REST Engineering Endpoints
- `ws://localhost:8000/ws/sim` &rarr; 25 Hz Kinematic Physics WebSocket
- `http://localhost:8000/docs` &rarr; Interactive Swagger / OpenAPI Documentation
- `http://localhost:8000/health` &rarr; Automated Healthcheck Probe

---

## 3. Option B: Docker Compose Deployment

The root [docker-compose.yml](../docker-compose.yml) provides production-grade orchestration:

### Production Mode (Default)
```bash
docker compose up -d --build
```
Runs the containerized unified app on port `8000` with automated health checks and restart policies.

### Development Mode (with Live Hot Reload)
```bash
docker compose --profile dev up --build
```
Spins up:
1. `app`: FastAPI backend on `http://localhost:8000`
2. `frontend-dev`: Vite HMR server on `http://localhost:5173` with isolated volume for `node_modules`

---

## 4. Option C: Cloud Platform Deployment

### Deploying to Render
1. Push your repository to GitHub.
2. Log in to [Render](https://render.com) and click **New &rarr; Blueprint**.
3. Connect your repository — Render will automatically detect [render.yaml](../render.yaml).
4. Click **Apply**. Render will automatically:
   - Build the Dockerfile multi-stage container
   - Allocate a public HTTPS/WSS URL (e.g., `https://assure-twin.onrender.com`)
   - Handle SSL certificates and healthchecks automatically

### Deploying to Railway
1. Click **New Project &rarr; Deploy from GitHub repo**.
2. Select your repository. Railway automatically detects the root [Dockerfile](../Dockerfile) and builds the application.
3. In **Settings &rarr; Networking**, click **Generate Domain**.

### Deploying to Heroku / Dokku / CapRover
The repository includes a production [Procfile](../Procfile):
```text
web: sh -c "python -m backend.app.seed && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
```

---

## 5. Environment Variables Reference

Copy `.env.example` to `.env` or set environment variables in your cloud provider's dashboard:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `PORT` | `8000` | Port for the HTTP/WebSocket server (automatically injected by cloud PaaS). |
| `DATABASE_URL` | `sqlite:///./assure_twin.db` | Database connection string. Use `postgresql://...` for managed Postgres. |
| `SECRET_KEY` | *(dev key)* | Cryptographic key for JWT/assurance token signing. **Must override in production**. |
| `CORS_ORIGINS` | `*` | Allowed origins (e.g. `https://my-domain.com`). |
| `PYTHONUNBUFFERED` | `1` | Ensures real-time stdout log streaming. |
| `VITE_API_URL` | `""` (same-origin fallback) | *(Optional)* Backend URL if hosting frontend separately. |
| `VITE_WS_URL` | `""` (same-origin fallback) | *(Optional)* WebSocket URL if hosting frontend separately. |

---

## 6. Pre-flight Verification Checklist

Before taking the application live, verify:
- [x] TypeScript compilation: `npm run build` exits 0.
- [x] Backend test suite: `python -m pytest backend/tests` (126 tests pass).
- [x] Database tables seed: `python -m backend.app.seed` initializes cleanly.
- [x] Static files mounted: `/` returns the 3D twin workstation bundle.
- [x] Healthcheck probe: `GET /health` returns `{"status": "HEALTHY"}`.
