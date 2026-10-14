/**
 * Smart_Ink 2D Function Curve Plotter Engine
 * Detects single-variable functions (e.g. y = x^2, f(x) = sin(x), y = 2x+1)
 * and generates high-resolution sampled coordinate data for interactive curve rendering.
 */

import { MathEngine } from './parser';

export interface PlotPoint {
  x: number;
  y: number;
}

export interface PlotData {
  title: string;
  expression: string;
  variable: string;
  points: PlotPoint[];
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export class FunctionPlotter {
  /**
   * Checks if an expression is a plottable 2D function, e.g.:
   * "y = x^2", "f(x) = sin(x)", "y = 2*x - 4", "y = x^3"
   */
  public static isPlottable(rawExpr: string): boolean {
    const expr = rawExpr.trim().replace(/\s+/g, '');
    // Matches patterns like y=..., f(x)=..., or any expr containing variable 'x' with an '='
    return (
      /^y=[a-zA-Z0-9+\-*/^().]+$/.test(expr) ||
      /^f\(x\)=[a-zA-Z0-9+\-*/^().]+$/.test(expr) ||
      (/[a-zA-Z0-9+\-*/^().]+=[a-zA-Z0-9+\-*/^().]+/.test(expr) && /\bx\b/.test(rawExpr))
    );
  }

  /**
   * Generates plot data for the function
   */
  public static generatePlot(
    rawExpr: string,
    xMin: number = -10,
    xMax: number = 10,
    steps: number = 200
  ): PlotData | null {
    let clean = rawExpr.trim();
    if (clean.endsWith('=')) {
      clean = clean.slice(0, -1).trim();
    }

    let rhs = clean;
    if (clean.includes('=')) {
      const parts = clean.split('=');
      // If starts with y = ... or f(x) = ...
      if (parts[0].trim().toLowerCase() === 'y' || parts[0].trim().toLowerCase() === 'f(x)') {
        rhs = parts[1].trim();
      } else if (parts[1].trim().toLowerCase() === 'y') {
        rhs = parts[0].trim();
      }
    }

    const engine = new MathEngine();
    const points: PlotPoint[] = [];
    const stepSize = (xMax - xMin) / steps;

    let computedYMin = Infinity;
    let computedYMax = -Infinity;

    for (let i = 0; i <= steps; i++) {
      const xVal = xMin + i * stepSize;
      engine.setVariable('x', xVal);

      const res = engine.evaluate(rhs);
      if (res.status === 'success' && res.value !== undefined && isFinite(res.value)) {
        // Clamp extreme asymptotic values (e.g. 1/x or tan(x)) to reasonable bounds
        if (Math.abs(res.value) <= 1000) {
          points.push({ x: xVal, y: res.value });
          if (res.value < computedYMin) computedYMin = res.value;
          if (res.value > computedYMax) computedYMax = res.value;
        }
      }
    }

    if (points.length < 5) return null;

    // Buffer Y axis
    if (!isFinite(computedYMin) || !isFinite(computedYMax)) {
      computedYMin = -10;
      computedYMax = 10;
    }
    const ySpan = Math.max(computedYMax - computedYMin, 2);
    const yMin = Math.max(computedYMin - ySpan * 0.1, -100);
    const yMax = Math.min(computedYMax + ySpan * 0.1, 100);

    return {
      title: clean,
      expression: rhs,
      variable: 'x',
      points,
      xMin,
      xMax,
      yMin,
      yMax,
    };
  }
}
