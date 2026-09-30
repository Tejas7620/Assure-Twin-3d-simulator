/**
 * src/ui/WorkstationApp.ts
 * Master Control-Room Workstation Orchestrator.
 * Transforms the user interface into the reference image architecture:
 * - Top Context Bar (Header)
 * - 8-Card KPI Strip
 * - Left Navigation with 24 functional views across 6 Tiers:
 *   OVERVIEW, OBSERVE, PREDICT, REHEARSE, DECIDE, TRUST, SETTINGS
 * - Central 3D Viewport with persistent WebGL renderer
 * - Real-time physics reactivity across all controls, charts, and recommendations.
 */

import './workstation.css';
import type { SimulationClient, SimulationState } from '../sim/SimulationClient.ts';
import type { AssureTwinManager } from '../assure/AssureTwinManager.ts';
import type { SolutionState } from '../assure/types.ts';
import { Environment } from '../scene/Environment.ts';
import { TopHeader } from './components/TopHeader.ts';
import { KpiStrip } from './components/KpiStrip.ts';
import { LeftNav, type PageId } from './components/LeftNav.ts';
import { OverviewView } from './pages/OverviewView.ts';
import { SimulatorView } from './pages/SimulatorView.ts';
import { WellStateView } from './pages/WellStateView.ts';
import { ForecastView } from './pages/ForecastView.ts';
import { PumpabilityView } from './pages/PumpabilityView.ts';
import { ScenariosView } from './pages/ScenariosView.ts';
import { OptimizationView } from './pages/OptimizationView.ts';
import { RecommendationView } from './pages/RecommendationView.ts';
import { AssuranceView } from './pages/AssuranceView.ts';
import { AlertsView } from './pages/AlertsView.ts';
import { HistoryView } from './pages/HistoryView.ts';
import { CalibrationView } from './pages/CalibrationView.ts';
import { ReportsView } from './pages/ReportsView.ts';
import { SettingsView } from './pages/SettingsView.ts';
import { ProductionView } from './pages/ProductionView.ts';
import { CSSHistoryView } from './pages/CSSHistoryView.ts';
import { SRPHealthView } from './pages/SRPHealthView.ts';
import { DynacardView } from './pages/DynacardView.ts';
import { OperatingEnvelopeView } from './pages/OperatingEnvelopeView.ts';
import { FailureRiskView } from './pages/FailureRiskView.ts';
import { CounterfactualLabView } from './pages/CounterfactualLabView.ts';
import { ModelDomainView } from './pages/ModelDomainView.ts';
import { ProvenanceView } from './pages/ProvenanceView.ts';
import { EvidenceModeView } from './pages/EvidenceModeView.ts';

export class WorkstationApp {
  private _root: HTMLElement;
  private _simClient: SimulationClient;
  private _assureManager: AssureTwinManager;
  private _environment: Environment;

  private _header!: TopHeader;
  private _kpiStrip!: KpiStrip;
  private _leftNav!: LeftNav;

  // View Containers
  private _contentArea!: HTMLElement;
  private _activePageId: PageId = 'overview';

  // Page Controllers
  private _overviewView!: OverviewView;
  private _simulatorView!: SimulatorView;
  private _wellStateView!: WellStateView;
  private _forecastView!: ForecastView;
  private _pumpabilityView!: PumpabilityView;
  private _scenariosView!: ScenariosView;
  private _optimizationView!: OptimizationView;
  private _recommendationView!: RecommendationView;
  private _assuranceView!: AssuranceView;
  private _alertsView!: AlertsView;
  private _historyView!: HistoryView;
  private _calibrationView!: CalibrationView;
  private _reportsView!: ReportsView;
  private _settingsView!: SettingsView;
  private _productionView!: ProductionView;
  private _cssHistoryView!: CSSHistoryView;
  private _srpHealthView!: SRPHealthView;
  private _dynacardView!: DynacardView;
  private _envelopeView!: OperatingEnvelopeView;
  private _failureRiskView!: FailureRiskView;
  private _counterfactualView!: CounterfactualLabView;
  private _modelDomainView!: ModelDomainView;
  private _provenanceView!: ProvenanceView;
  private _evidenceView!: EvidenceModeView;

  constructor(
    simClient: SimulationClient,
    assureManager: AssureTwinManager,
    environment: Environment
  ) {
    this._simClient = simClient;
    this._assureManager = assureManager;
    this._environment = environment;

    // Create root workstation element
    this._root = document.createElement('div');
    this._root.id = 'workstation-root';
    document.body.appendChild(this._root);

    this.buildShell();
    this.initViews();
    this.bindEvents();

    // Initial page mount
    this.navigateTo('overview');

    // Subscribe to state streams
    this._simClient.subscribe(s => this.handleSimUpdate(s));
    this._assureManager.subscribe(sol => this.handleSolutionUpdate(sol));
  }

  private buildShell(): void {
    this._root.innerHTML = `
      <div id="ws-header-mount"></div>
      <div id="ws-kpi-mount"></div>
      <div class="ws-body">
        <div id="ws-nav-mount"></div>
        <main class="ws-content-area" id="ws-content-mount"></main>
      </div>
    `;

    const hdrMount = this._root.querySelector('#ws-header-mount') as HTMLElement;
    this._header = new TopHeader(hdrMount, {
      onTogglePlayPause: () => {
        // Toggle play/pause in simulation
      },
      onOpenNotifications: () => {
        this.navigateTo('alerts');
      }
    });

    const kpiMount = this._root.querySelector('#ws-kpi-mount') as HTMLElement;
    this._kpiStrip = new KpiStrip(kpiMount);

    const navMount = this._root.querySelector('#ws-nav-mount') as HTMLElement;
    this._leftNav = new LeftNav(navMount, {
      onSelectPage: (pageId) => {
        this.navigateTo(pageId);
      }
    });

    this._contentArea = this._root.querySelector('#ws-content-mount') as HTMLElement;
  }

  private initViews(): void {
    // 1. Overview Page
    const ovContainer = document.createElement('div');
    ovContainer.style.height = '100%';
    this._overviewView = new OverviewView(
      ovContainer,
      this._simClient,
      this._assureManager,
      this._environment,
      {
        onOpenRecommendation: () => this.navigateTo('recommendation'),
        onOpenScenarios: () => this.navigateTo('scenarios'),
        onNavigate: (pageId) => this.navigateTo(pageId as PageId)
      }
    );

    // 2. Full 3D Simulator Page
    const simContainer = document.createElement('div');
    simContainer.style.height = '100%';
    this._simulatorView = new SimulatorView(
      simContainer,
      this._simClient,
      this._assureManager,
      this._environment
    );

    // 3. Well State
    const wsContainer = document.createElement('div');
    this._wellStateView = new WellStateView(wsContainer);

    // 4. Forecast
    const fcContainer = document.createElement('div');
    this._forecastView = new ForecastView(fcContainer);

    // 5. Scenarios
    const scContainer = document.createElement('div');
    this._scenariosView = new ScenariosView(scContainer, this._assureManager);

    // 6. Optimization
    const optContainer = document.createElement('div');
    this._optimizationView = new OptimizationView(optContainer, this._assureManager, this._simClient);

    // 7. Recommendation
    const recContainer = document.createElement('div');
    this._recommendationView = new RecommendationView(recContainer, this._assureManager);

    // 8. Assurance
    const asrContainer = document.createElement('div');
    this._assuranceView = new AssuranceView(asrContainer, this._assureManager);

    // 9. Alerts
    const alContainer = document.createElement('div');
    this._alertsView = new AlertsView(alContainer);

    // 10. History & Audit
    const histContainer = document.createElement('div');
    this._historyView = new HistoryView(histContainer);

    // 11. Calibration
    const calContainer = document.createElement('div');
    this._calibrationView = new CalibrationView(calContainer, this._assureManager);

    // 12. Pumpability
    const pvContainer = document.createElement('div');
    this._pumpabilityView = new PumpabilityView(pvContainer, (page) => this.navigateTo(page as PageId), this._simClient);

    // 13. Reports
    const repContainer = document.createElement('div');
    this._reportsView = new ReportsView(repContainer, this._assureManager);

    // 14. Settings
    const setContainer = document.createElement('div');
    this._settingsView = new SettingsView(setContainer);

    // 15. Production View
    const prodContainer = document.createElement('div');
    this._productionView = new ProductionView(prodContainer);

    // 16. CSS History View
    const cssContainer = document.createElement('div');
    this._cssHistoryView = new CSSHistoryView(cssContainer);

    // 17. SRP Health View
    const srpContainer = document.createElement('div');
    this._srpHealthView = new SRPHealthView(srpContainer);

    // 18. Dynacard View
    const dynContainer = document.createElement('div');
    this._dynacardView = new DynacardView(dynContainer);

    // 19. Operating Envelope View
    const envContainer = document.createElement('div');
    this._envelopeView = new OperatingEnvelopeView(envContainer);

    // 20. Failure Risk View
    const failContainer = document.createElement('div');
    this._failureRiskView = new FailureRiskView(failContainer);

    // 21. Counterfactual Lab View
    const cflContainer = document.createElement('div');
    this._counterfactualView = new CounterfactualLabView(cflContainer, this._assureManager, this._simClient);

    // 22. Model Domain View
    const mdContainer = document.createElement('div');
    this._modelDomainView = new ModelDomainView(mdContainer);

    // 23. Provenance View
    const provContainer = document.createElement('div');
    this._provenanceView = new ProvenanceView(provContainer);

    // 24. Evidence Mode View
    const evContainer = document.createElement('div');
    this._evidenceView = new EvidenceModeView(evContainer);
  }

  public navigateTo(pageId: PageId): void {
    this._activePageId = pageId;
    this._leftNav.setActivePage(pageId);
    this._contentArea.innerHTML = '';

    switch (pageId) {
      case 'overview':
        this._contentArea.appendChild(this._overviewView['_container']);
        this._overviewView.mount3D();
        break;
      case 'simulator':
        this._contentArea.appendChild(this._simulatorView['_container']);
        this._simulatorView.mount3D();
        break;
      case 'wellstate':
        this._contentArea.appendChild(this._wellStateView['_container']);
        break;
      case 'production':
        this._contentArea.appendChild(this._productionView['_container']);
        break;
      case 'csshistory':
        this._contentArea.appendChild(this._cssHistoryView['_container']);
        break;
      case 'srphealth':
        this._contentArea.appendChild(this._srpHealthView['_container']);
        break;
      case 'dynacard':
        this._contentArea.appendChild(this._dynacardView['_container']);
        break;
      case 'forecast':
        this._contentArea.appendChild(this._forecastView['_container']);
        break;
      case 'pumpability':
        this._contentArea.appendChild(this._pumpabilityView['_container']);
        break;
      case 'envelope':
        this._contentArea.appendChild(this._envelopeView['_container']);
        break;
      case 'failurerisk':
        this._contentArea.appendChild(this._failureRiskView['_container']);
        break;
      case 'scenarios':
        this._contentArea.appendChild(this._scenariosView['_container']);
        break;
      case 'counterfactual':
        this._contentArea.appendChild(this._counterfactualView['_container']);
        break;
      case 'optimization':
        this._contentArea.appendChild(this._optimizationView['_container']);
        break;
      case 'recommendation':
        this._contentArea.appendChild(this._recommendationView['_container']);
        break;
      case 'assurance':
        this._contentArea.appendChild(this._assuranceView['_container']);
        break;
      case 'modeldomain':
        this._contentArea.appendChild(this._modelDomainView['_container']);
        break;
      case 'provenance':
        this._contentArea.appendChild(this._provenanceView['_container']);
        break;
      case 'history':
        this._contentArea.appendChild(this._historyView['_container']);
        break;
      case 'calibration':
        this._contentArea.appendChild(this._calibrationView['_container']);
        break;
      case 'reports':
        this._contentArea.appendChild(this._reportsView['_container']);
        break;
      case 'evidence':
        this._contentArea.appendChild(this._evidenceView['_container']);
        break;
      case 'alerts':
        this._contentArea.appendChild(this._alertsView['_container']);
        break;
      case 'settings':
        this._contentArea.appendChild(this._settingsView['_container']);
        break;
    }

    // Trigger immediate update on the active page
    this.handleSimUpdate(this._simClient.state);
    this.handleSolutionUpdate(this._assureManager.solutionState);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      if (this._activePageId === 'overview') {
        this._overviewView.resize3D();
      } else if (this._activePageId === 'simulator') {
        this._simulatorView.mount3D();
      }
    });
  }

  private handleSimUpdate(state: SimulationState): void {
    const sol = this._assureManager.solutionState;
    this._header?.update(state, sol);
    this._kpiStrip?.update(state, sol);

    if (this._activePageId === 'overview') {
      this._overviewView?.update(state, sol);
    } else if (this._activePageId === 'simulator') {
      this._simulatorView?.update(state);
    } else if (this._activePageId === 'wellstate') {
      this._wellStateView?.update(state, sol);
    } else if (this._activePageId === 'production') {
      this._productionView?.update(state, sol);
    } else if (this._activePageId === 'csshistory') {
      this._cssHistoryView?.update(state, sol);
    } else if (this._activePageId === 'srphealth') {
      this._srpHealthView?.update(state, sol);
    } else if (this._activePageId === 'dynacard') {
      this._dynacardView?.update(state, sol);
    } else if (this._activePageId === 'pumpability') {
      this._pumpabilityView?.update(state, sol);
    } else if (this._activePageId === 'envelope') {
      this._envelopeView?.update(state, sol);
    } else if (this._activePageId === 'failurerisk') {
      this._failureRiskView?.update(state, sol);
    } else if (this._activePageId === 'counterfactual') {
      this._counterfactualView?.update(state, sol);
    } else if (this._activePageId === 'modeldomain') {
      this._modelDomainView?.update(state, sol);
    } else if (this._activePageId === 'provenance') {
      this._provenanceView?.update(state, sol);
    } else if (this._activePageId === 'evidence') {
      this._evidenceView?.update(state, sol);
    }
  }

  private handleSolutionUpdate(solution: SolutionState): void {
    const state = this._simClient.state;
    this._header?.update(state, solution);
    this._kpiStrip?.update(state, solution);

    const status = solution.wellHealth === 'CRITICAL' ? 'CRITICAL' : (solution.wellHealth === 'WARNING' ? 'WARNING' : 'NORMAL');
    this._leftNav?.updateStatus(status);

    if (this._activePageId === 'overview') {
      this._overviewView?.update(state, solution);
    } else if (this._activePageId === 'wellstate') {
      this._wellStateView?.update(state, solution);
    } else if (this._activePageId === 'production') {
      this._productionView?.update(state, solution);
    } else if (this._activePageId === 'csshistory') {
      this._cssHistoryView?.update(state, solution);
    } else if (this._activePageId === 'srphealth') {
      this._srpHealthView?.update(state, solution);
    } else if (this._activePageId === 'dynacard') {
      this._dynacardView?.update(state, solution);
    } else if (this._activePageId === 'forecast') {
      this._forecastView?.update(state, solution);
    } else if (this._activePageId === 'pumpability') {
      this._pumpabilityView?.update(state, solution);
    } else if (this._activePageId === 'envelope') {
      this._envelopeView?.update(state, solution);
    } else if (this._activePageId === 'failurerisk') {
      this._failureRiskView?.update(state, solution);
    } else if (this._activePageId === 'scenarios') {
      this._scenariosView?.update(solution, this._assureManager.activeRehearsals);
    } else if (this._activePageId === 'counterfactual') {
      this._counterfactualView?.update(state, solution);
    } else if (this._activePageId === 'optimization') {
      this._optimizationView?.update(solution);
    } else if (this._activePageId === 'recommendation') {
      this._recommendationView?.update(solution, this._assureManager.activeRecommendationCase);
    } else if (this._activePageId === 'assurance') {
      this._assuranceView?.update(solution);
    } else if (this._activePageId === 'modeldomain') {
      this._modelDomainView?.update(state, solution);
    } else if (this._activePageId === 'provenance') {
      this._provenanceView?.update(state, solution);
    } else if (this._activePageId === 'evidence') {
      this._evidenceView?.update(state, solution);
    } else if (this._activePageId === 'alerts') {
      this._alertsView?.update(solution);
    } else if (this._activePageId === 'history') {
      this._historyView?.update(solution);
    } else if (this._activePageId === 'calibration') {
      this._calibrationView?.update(solution);
    } else if (this._activePageId === 'reports') {
      this._reportsView?.update(solution);
    }
  }
}
