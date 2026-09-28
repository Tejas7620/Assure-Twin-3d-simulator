# Protected Existing 3D Simulator Components
### Strict Immutability Map for ASSURE-TWIN (PS 26120)

To preserve the working Three.js 3D physical simulator, kinematics, and particle dynamics, the following core files are designated **IMMUTABLE** and protected from destructive modifications:

| Category | File Path | Protected Capabilities |
| :--- | :--- | :--- |
| **3D Kinematics** | `src/kinematics/PumpjackKinematics.ts` | Exact 4-bar linkage kinematics (crank, pitman arm, equalizer, walking beam, horsehead, polished rod trajectory). |
| **3D Scene Models** | `src/scene/PumpjackModel.ts` | 3D mesh hierarchy, sampson posts, counterweights, polished rod, stuffing box, downhole plunger pump. |
| **3D Surface Facilities**| `src/scene/Facilities.ts` | Wellhead Christmas tree, steam generator, 3-phase test separator, stock tanks. |
| **3D Subsurface/Fluids**| `src/scene/FluidPath.ts` | Casing, tubing string, deviated horizontal trajectory ($1,420\text{ m}$ TVD), surface flowlines. |
| **Oil Particle Flow** | `src/scene/OilParticleSystem.ts` | Velocity-controlled particle dynamics from downhole pump through tubing to surface manifold. |
| **Steam Particle Flow**| `src/scene/SteamParticleSystem.ts`| Animated steam injection plume representing cyclic thermal stimulation. |
| **Thermal Reservoir** | `src/scene/ThermalViscosityGrid.ts`| 3D subsurface thermal front and Andrade viscosity field visualization. |
| **3D Environment** | `src/scene/Environment.ts` | Three.js scene, camera, lighting, OrbitControls, terrain geometry, rendering loop. |
| **3D Textures** | `src/textures/*` | Procedural canvas-generated textures (metal, rust, desert ground). |
| **Simulation Client** | `src/sim/SimulationClient.ts` | Authoritative client interface and local mathematical fallback loop. |
| **Original Dyno Card** | `src/ui/DynoCard.ts` | Original 2D dynamometer card rendering logic. |

---

### Non-Destructive Extension Principle
All new features—including the layout repair, scrollable engineering panels, interactive detail drawers, 12-checkpoint decision assurance gatekeeper, future forecast projections, joint optimization solvers, and the full FastAPI backend—are built **around** and **downstream of** these protected simulation assets without altering their internal mathematics or 3D scene graphs.
