/**
 * src/ui/WorkstationApp.ts
 * Master Control-Room Workstation Orchestrator.
 * Transforms the user interface into the reference image architecture:
 * - Top Context Bar (Header)
 * - 8-Card KPI Strip
 * - Left Navigation with 11 functional views
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
    this._pumpabilityView = new PumpabilityView(pvContainer, (page) => this.navigateTo(page as PageId));

    // 13. Reports
    const repContainer = document.createElement('div');
    this._reportsView = new ReportsView(repContainer, this._assureManager);

    // 14. Settings
    const setContainer = document.createElement('div');
    this._settingsView = new SettingsView(setContainer);
  }

  public navigateTo(pageId: PageId): void {
    this._activePageId = pageId;
    this._leftNav.setActivePage(pageId);
    this._contentArea.innerHTML = '';

    switch (pageId) {
      case 'overview':
        this._contentArea.appendChild(this._overviewView['_container']);
        this._overviewView.resize3D();
        break;
      case 'simulator':
        this._contentArea.appendChild(this._simulatorView['_container']);
        this._simulatorView.mount3D();
        break;
      case 'wellstate':
        this._contentArea.appendChild(this._wellStateView['_container']);
        break;
      case 'forecast':
        this._contentArea.appendChild(this._forecastView['_container']);
        break;
      case 'pumpability':
        this._contentArea.appendChild(this._pumpabilityView['_container']);
        break;
      case 'scenarios':
        this._contentArea.appendChild(this._scenariosView['_container']);
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
      case 'alerts':
        this._contentArea.appendChild(this._alertsView['_container']);
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
    } else if (this._activePageId === 'pumpability') {
      this._pumpabilityView?.update(state, sol);
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
    } else if (this._activePageId === 'forecast') {
      this._forecastView?.update(state, solution);
    } else if (this._activePageId === 'pumpability') {
      this._pumpabilityView?.update(state, solution);
    } else if (this._activePageId === 'scenarios') {
      this._scenariosView?.update(solution, this._assureManager.activeRehearsals);
    } else if (this._activePageId === 'optimization') {
      this._optimizationView?.update(solution);
    } else if (this._activePageId === 'recommendation') {
      this._recommendationView?.update(solution, this._assureManager.activeRecommendationCase);
    } else if (this._activePageId === 'assurance') {
      this._assuranceView?.update(solution);
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
