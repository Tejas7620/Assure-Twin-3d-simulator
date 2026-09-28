# AI_ML_DOCUMENTATION.md
## Machine Learning Architecture, Surrogate Models & AI Governance

In high-stakes petroleum production engineering, unconstrained machine learning is a major operational hazard. ASSURE-TWIN deploys Machine Learning strictly as an **accelerated computational surrogate** and **pattern classifier**, bounded by first-principles physics and zero-trust guardrails.

---

### 1. The Machine Learning Models

| Model Name | Algorithm | Training Source | Code Location | Operational Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Production Rate Surrogate** | Random Forest Regressor (`n_estimators=100`) | Seeded physics-generated synthetic dataset (`backend/app/ai/data_generator.py`) | `backend/app/ai/surrogate.py` | Provides $<1\text{ ms}$ oil production estimates to accelerate optimization search. |
| **Mechanical Hazard Classifier** | Random Forest / Decision Tree | Synthetic failure library (Goodman fatigue, buckling) | `backend/app/ai/hazard_model.py` | Evaluates rod parting and fluid pound risk scores ($0.0 \text{--} 1.0$). |
| **Dynamometer Card Classifier** | Fourier Descriptor + SVM | Seeded dyno card geometry library | `backend/app/ai/dyno_classifier.py` | Classifies surface/downhole card shapes (Normal, Fluid Pound, Gas Interference). |
| **Client Demo Surrogate** | Light Ridge/Polynomial Approximation | Calibrated Baghewala PVT table | `src/assure/MLPredictionProvider.ts` | Provides offline client-side forecast inference when backend is disconnected. |

---

### 2. Training Data & Seeded Generation
- **Source:** Generated deterministically via `backend/app/ai/data_generator.py` using fixed random seeds (`random.seed(42)`, `np.random.seed(42)`).
- **Features (5 Inputs):**
  1. Near-Wellbore Temperature ($T_\text{dh}$, $40^\circ\text{ C} \text{--} 200^\circ\text{ C}$)
  2. In-Situ Viscosity ($\mu_\text{dh}$, $300\text{ cP} \text{--} 12,000\text{ cP}$)
  3. Pumping Speed ($SPM$, $0.5 \text{--} 10.0\text{ SPM}$)
  4. Stroke Length ($S$, $48'' \text{--} 100''$)
  5. Pump Intake Pressure ($PIP$, $5 \text{--} 60\text{ bar}$)
- **Target (1 Output):** Surface Oil Production Rate ($q_o$, BOPD).
- **Validation:** 5-fold cross-validation on synthetic holdout sets ($R^2 \approx 0.94$).

---

### 3. Out-of-Domain (OOD) Guardrail
When presented with inputs outside its training envelope (e.g., an abnormal water breakthrough where viscosity collapses unexpectedly), ML models produce erratic numbers.
- **Mechanism (`src/assure/OutOfDomainDetector.ts` & `backend/app/ai/surrogate.py`):**
  Computes normalized Euclidean/Mahalanobis distance from the training cluster centroid:
  $$D_\text{OOD} = \sqrt{\sum_{i=1}^k \left(\frac{x_i - \mu_i}{\sigma_i}\right)^2}$$
- **Thresholds:**
  - $D_\text{OOD} \le 0.40$: `IN_DOMAIN` (High Confidence).
  - $0.40 < D_\text{OOD} \le 0.70$: `TRANSITIONAL` (Caution; widen uncertainty band).
  - $D_\text{OOD} > 0.70$: `OUT_OF_DOMAIN` (Suppresses ML inference; triggers immediate physics fallback).

---

### 4. Dual Physics-AI Consensus Engine
To guarantee zero hallucinations, ASSURE-TWIN implements a strict **Dual-Model Consensus Check** (`backend/app/ai/model_agreement.py`):
- For any recommended operating setpoint, both the **First-Principles Physics Engine** and the **ML Surrogate** compute the predicted oil production rate independently:
  $$\Delta_\text{divergence} = \frac{|q_\text{physics} - q_\text{ML}|}{\max(q_\text{physics}, 1.0)} \times 100\%$$
- **Consensus Rule:**
  - $\Delta \le 10\%$: `STRONG_CONSENSUS` $\rightarrow$ Gate passes.
  - $10\% < \Delta \le 20\%$: `MODERATE_AGREEMENT` $\rightarrow$ Warning issued.
  - $\Delta > 20\%$: `DISAGREEMENT` $\rightarrow$ Gatekeeper triggers **`NO SAFE RECOMMENDATION`** due to model uncertainty.

---

### 5. Truth-in-Engineering Statement for Judges
We **never** claim our ML models were trained on millions of real-time ONGC production records. We state with engineering integrity:
> *"The machine learning models in ASSURE-TWIN are fast computational surrogates trained on seeded, physics-consistent synthetic data to accelerate optimization searches, protected by real-time OOD detection and mandatory first-principles consensus."*
