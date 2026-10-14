/**
 * Smart_Ink Web Worker for Non-blocking Math Inference & Equation Parsing
 * Runs asynchronously off the main UI thread to guarantee 60 FPS drawing frame rates.
 */

import { Stroke, RecognizedEquation } from '../canvas/types';
import { EquationSegmenter } from '../recognizer/segmenter';
import { MathEngine } from '../engine/parser';

const mathEngine = new MathEngine();

export interface WorkerInputMessage {
  type: 'PROCESS_STROKES';
  strokes: Stroke[];
  existingVariables?: Record<string, number>;
}

export interface WorkerOutputMessage {
  type: 'EQUATIONS_RECOGNIZED';
  equations: RecognizedEquation[];
  variables: Record<string, number>;
}

self.onmessage = (event: MessageEvent<WorkerInputMessage>) => {
  const { type, strokes, existingVariables } = event.data;

  if (type === 'PROCESS_STROKES') {
    try {
      mathEngine.resetDefaults();
      if (existingVariables) {
        for (const [key, val] of Object.entries(existingVariables)) {
          mathEngine.setVariable(key, val);
        }
      }

      const equations = EquationSegmenter.processStrokes(strokes, mathEngine);
      const variables = mathEngine.getAllVariables();

      const response: WorkerOutputMessage = {
        type: 'EQUATIONS_RECOGNIZED',
        equations,
        variables,
      };

      self.postMessage(response);
    } catch (err: any) {
      console.error('[Smart_Ink Worker Error]', err);
      self.postMessage({
        type: 'EQUATIONS_RECOGNIZED',
        equations: [],
        variables: {},
      });
    }
  }
};
