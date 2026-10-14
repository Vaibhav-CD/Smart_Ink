import { describe, it, expect } from 'vitest';
import { FunctionPlotter } from '../plotter';

describe('FunctionPlotter 2D Curve Generation', () => {
  it('identifies plottable 2D equations', () => {
    expect(FunctionPlotter.isPlottable('y = x^2')).toBe(true);
    expect(FunctionPlotter.isPlottable('y = 2*x + 1')).toBe(true);
    expect(FunctionPlotter.isPlottable('f(x) = sin(x)')).toBe(true);
    expect(FunctionPlotter.isPlottable('18 + 4 * 3 =')).toBe(false);
  });

  it('generates high-resolution sample points for y = x^2', () => {
    const plot = FunctionPlotter.generatePlot('y = x^2', -5, 5, 50);
    expect(plot).not.toBeNull();
    if (plot) {
      expect(plot.points.length).toBeGreaterThan(40);
      expect(plot.xMin).toBe(-5);
      expect(plot.xMax).toBe(5);
      // Vertex at origin (0, 0)
      const nearZero = plot.points.find((p) => Math.abs(p.x) < 0.2);
      expect(nearZero).toBeDefined();
      expect(nearZero!.y).toBeCloseTo(0, 1);
    }
  });

  it('generates plot points for trigonometric function y = sin(x)', () => {
    const plot = FunctionPlotter.generatePlot('y = sin(x)', -3.14, 3.14, 40);
    expect(plot).not.toBeNull();
    if (plot) {
      expect(plot.points.length).toBeGreaterThan(30);
    }
  });
});
