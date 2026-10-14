import { describe, it, expect } from 'vitest';
import { classifyByTopology } from '../topology';
import { Stroke, Point } from '../../canvas/types';
import { computeBoundingBox } from '../../canvas/strokeUtils';

function createStroke(pts: [number, number][]): Stroke {
  const points: Point[] = pts.map(([x, y]) => ({ x, y, pressure: 0.5, time: Date.now() }));
  return {
    id: `test_stroke_${Math.random()}`,
    points,
    color: '#000000',
    width: 3,
    tool: 'pen',
    timestamp: Date.now(),
    bounds: computeBoundingBox(points),
  };
}

describe('Topological & Geometric Math Classifier', () => {
  it('correctly classifies equals sign (=) with two parallel horizontal bars', () => {
    const s1 = createStroke([[10, 20], [35, 20]]);
    const s2 = createStroke([[10, 30], [35, 30]]);
    const res = classifyByTopology([s1, s2]);
    expect(res.char).toBe('=');
    expect(res.confidence).toBeGreaterThan(0.9);
  });

  it('correctly classifies plus sign (+) with crossing horizontal and vertical bars', () => {
    const s1 = createStroke([[20, 10], [20, 30]]);
    const s2 = createStroke([[10, 20], [30, 20]]);
    const res = classifyByTopology([s1, s2]);
    expect(res.char).toBe('+');
    expect(res.confidence).toBeGreaterThan(0.9);
  });

  it('correctly classifies minus sign (-) with single horizontal stroke', () => {
    const s = createStroke([[10, 20], [40, 20]]);
    const res = classifyByTopology([s]);
    expect(res.char).toBe('-');
    expect(res.confidence).toBeGreaterThan(0.9);
  });

  it('correctly classifies decimal point (.) as dot', () => {
    const s = createStroke([[15, 35], [16, 35]]);
    const res = classifyByTopology([s]);
    expect(res.char).toBe('.');
    expect(res.confidence).toBeGreaterThan(0.9);
  });

  it('correctly classifies digit 1 as vertical stroke', () => {
    const s = createStroke([[20, 10], [20, 50]]);
    const res = classifyByTopology([s]);
    expect(res.char).toBe('1');
    expect(res.confidence).toBeGreaterThan(0.9);
  });

  it('correctly classifies digit 0 as closed loop', () => {
    const pts: [number, number][] = [];
    const cx = 25, cy = 25, rx = 10, ry = 18;
    for (let a = 0; a <= Math.PI * 2; a += 0.4) {
      pts.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    const s = createStroke(pts);
    const res = classifyByTopology([s]);
    expect(res.char).toBe('0');
    expect(res.confidence).toBeGreaterThan(0.85);
  });
});
