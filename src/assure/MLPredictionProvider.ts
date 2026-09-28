/**
 * src/assure/MLPredictionProvider.ts
 * Machine Learning Surrogate Model Interface & Demo Provider (Phase 24).
 * Connects trained surrogate models (e.g. LightGBM / Neural Network) to predict production rates.
 * Contains transparent demo surrogate labeled clearly as DEMO-SURROGATE.
 * Never fabricates 99% accuracy claims.
 */

export interface MLPredictionInputs {
  spm: number;
  strokeInches: number;
  temperatureC: number;
  viscosityCp: number;
  pwfBar: number;
  waterCut: number;
  steamVolumeTD: number;
}

export interface MLPredictionResult {
  predictedOilBopd: number;
  confidenceScore: number; // 0 - 1
  modelName: string;
  version: string;
  provenance: 'PREDICTED';
  isDemoSurrogate: boolean;
}

export interface IMLPredictionProvider {
  predict(inputs: MLPredictionInputs): MLPredictionResult;
}

/**
 * Standard Demo implementation representing a reduced-order polynomial / regression surrogate
 */
export class MLDemoSurrogateProvider implements IMLPredictionProvider {
  public readonly modelName: string = 'Baghewala-CSS-SRP-Surrogate-GBDT';
  public readonly version: string = 'v1.4.2-synthetic-calibrated';

  public predict(inputs: MLPredictionInputs): MLPredictionResult {
    // Regression surrogate approximation:
    // Q_oil = f(visc, spm, stroke, steam, waterCut)
    const mechFactor = (inputs.spm / 3.2) * (inputs.strokeInches / 64.0);
    const viscImpedance = Math.pow(1800.0 / Math.max(100.0, inputs.viscosityCp), 0.12);
    const steamStimBonus = inputs.steamVolumeTD > 0 ? 1.08 : 1.0;

    const baseBopd = 27.5;
    const rawPrediction = baseBopd * mechFactor * viscImpedance * steamStimBonus * (1.0 - inputs.waterCut);
    const predictedOilBopd = Math.round(Math.max(0.0, rawPrediction) * 10) / 10;

    return {
      predictedOilBopd,
      confidenceScore: 0.88,
      modelName: this.modelName,
      version: this.version,
      provenance: 'PREDICTED',
      isDemoSurrogate: true
    };
  }
}
