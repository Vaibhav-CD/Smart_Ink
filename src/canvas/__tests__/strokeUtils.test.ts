import { describe, it, expect } from 'vitest';
import {
  computeBoundingBox,
  boxesIntersect,
  pointDistance,
  distToSegment,
  detectScratchGesture,
} from '../strokeUtils';
import { Point } from '../types';

describe('Stroke Mathematics & Geometric Utilities', () => {
  it('computes accurate axis-aligned bounding boxes', () => {
    const points: Point[] = [
      { x: 10, y: 20 },
      { x: 50, y: 5 },
      { x: 30, y: 80 },
    ];
    const bbox = computeBoundingBox(points);
    expect(bbox.minX).toBe(10);
    expect(bbox.maxX).toBe(50);
    expect(bbox.minY).toBe(5);
    expect(bbox.maxY).toBe(80);
    expect(bbox.width).toBe(40);
    expect(bbox.height).toBe(75);
    expect(bbox.centerX).toBe(30);
    expect(bbox.centerY).toBe(42.5);
  });

  it('detects intersecting bounding boxes with margin', () => {
    const boxA = computeBoundingBox([{ x: 0, y: 0 }, { x: 20, y: 20 }]);
    const boxB = computeBoundingBox([{ x: 25, y: 25 }, { x: 40, y: 40 }]);

    expect(boxesIntersect(boxA, boxB, 0)).toBe(false);
    expect(boxesIntersect(boxA, boxB, 6)).toBe(true);
  });

  it('calculates point distance correctly', () => {
    expect(pointDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('calculates distance from point to line segment', () => {
    const v = { x: 0, y: 0 };
    const w = { x: 10, y: 0 };
    // Point directly above segment
    expect(distToSegment({ x: 5, y: 5 }, v, w)).toBe(5);
    // Point before start
    expect(distToSegment({ x: -3, y: 0 }, v, w)).toBe(3);
    // Point past end
    expect(distToSegment({ x: 14, y: 0 }, v, w)).toBe(4);
  });

  describe('Scratch-to-Erase Gesture Detection', () => {
    it('detects rapid horizontal zig-zag scribbles as scratch gesture', () => {
      const scribblePoints: Point[] = [
        { x: 10, y: 50 },
        { x: 40, y: 52 },
        { x: 8, y: 54 },
        { x: 42, y: 56 },
        { x: 11, y: 58 },
        { x: 39, y: 60 },
        { x: 12, y: 62 },
        { x: 41, y: 64 },
      ];
      const res = detectScratchGesture(scribblePoints);
      expect(res.isScratch).toBe(true);
      expect(res.bounds.width).toBeGreaterThan(0);
    });

    it('does not classify standard smooth strokes as scratches', () => {
      const straightLine: Point[] = [
        { x: 10, y: 10 },
        { x: 15, y: 15 },
        { x: 20, y: 20 },
        { x: 25, y: 25 },
        { x: 30, y: 30 },
      ];
      const res = detectScratchGesture(straightLine);
      expect(res.isScratch).toBe(false);
    });
  });
});
