# TECH_STACK.md
## Definitive Technology Stack Audit: Implemented vs. Future

To maintain absolute credibility during SIH judging, this document provides a verified audit separating technologies **actually implemented in the working codebase** from technologies designated for **future enterprise deployment**.

---

### 1. Actually Implemented Technology Stack (Working in Repository)

| Technology | Version | Purpose in Project | Code Location / Evidence | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TypeScript** | `v5.8.2` | Core frontend language, type safety, modular interfaces | `src/**/*.ts`, `tsconfig.json` | **ACTIVE** |
| **Vite** | `v6.2.0` | Ultra-fast frontend bundler and dev server | `package.json`, `vite.config.ts` | **ACTIVE** |
| **Three.js** | `v0.160.0` | WebGL 3D graphics, API Spec 11E kinematic animation | `src/scene/**/*` | **ACTIVE** |
| **Vanilla CSS3** | Modern | Custom dark-mode industrial control-room tokens, glassmorphism | `index.html`, inline style tokens | **ACTIVE** |
| **Python** | `v3.13.7` | Backend language for physics, AI, and REST APIs | `backend/**/*.py` | **ACTIVE** |
| **FastAPI** | `v0.115.6` | Asynchronous REST and WebSocket API framework | `backend/app/main.py` | **ACTIVE** |
| **Uvicorn** | `v0.34.0` | High-performance ASGI server | Server runtime task | **ACTIVE** |
| **NumPy** | `v2.2.3` | Vectorized numerical modeling and matrix mathematics | `backend/app/physics/**/*` | **ACTIVE** |
| **SciPy** | `v1.15.2` | Differential evolution optimization and curve fitting | `backend/app/optimization/**/*` | **ACTIVE** |
| **scikit-learn**| `v1.6.1` | Random Forest ML surrogates and OOD detection | `backend/app/ai/surrogate.py` | **ACTIVE** |
| **SQLAlchemy** | `v2.0.38` | ORM modeling 25 relational well entities | `backend/app/models/entities.py` | **ACTIVE** |
| **SQLite 3** | Embedded | Transactional relational storage | `assure_twin.db` | **ACTIVE** |
| **Pytest** | `v9.1.1` | Automated backend testing framework (64 passing tests)| `backend/tests/*` | **ACTIVE** |
| **TSX Runner** | `v4.19.2` | Automated frontend TypeScript test execution (30 tests)| `src/assure/tests/*` | **ACTIVE** |

---

### 2. Proposed / Future Enterprise Stack (Roadmap Only)

The following technologies are architecturally planned for enterprise deployment on ONGC field assets, but are **NOT** claimed as current runtime components:

| Technology | Intended Role in Enterprise Deployment | Current Status in Codebase |
| :--- | :--- | :--- |
| **Industrial OPC-UA / MQTT** | Direct edge hardware protocol for reading wellhead RTUs | Planned; current prototype uses simulated telemetry streams. |
| **TimescaleDB / PostgreSQL** | High-throughput distributed time-series historian | Planned; current prototype uses lightweight SQLite (`assure_twin.db`). |
| **Docker / Kubernetes** | Multi-container edge deployment for field gathering stations | Prototype Dockerfile present; orchestration planned for pilot. |
| **PyTorch / Deep Learning**| Complex multi-well spatial reservoir autoencoders | Planned for Phase 3; current prototype uses scikit-learn RF surrogate. |
| **React / Next.js** | Large-scale multi-user portal | Not needed; current prototype runs high-performance Vanilla TS. |

---

### 3. Rules of Truth for Presentation
- **Never claim React or Tailwind:** The frontend is built on pure high-performance TypeScript and Vanilla CSS.
- **Never claim live OPC-UA SCADA link:** Transparently explain that telemetry is currently simulated through calibrated Baghewala field profiles and WebSocket streams.
- **Emphasize Pytest & TSX verification:** 94 automated regression tests prove code quality and robustness.
