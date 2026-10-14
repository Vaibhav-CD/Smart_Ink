/**
 * Smart_Ink Sample Handwritten Equations
 * Provides realistic vector handwriting strokes for demoing & quick validation.
 */

import { Stroke, Point } from './types';
import { computeBoundingBox } from './strokeUtils';

export interface SamplePreset {
  id: string;
  name: string;
  description: string;
  generateStrokes: (startX: number, startY: number) => Stroke[];
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'bodmas_order',
    name: '18 + 4 * 3 =',
    description: 'BODMAS precedence evaluation (30)',
    generateStrokes: (sx, sy) => {
      const strokes: Stroke[] = [];
      let x = sx;
      const y = sy;
      const w = 3.5;
      const c = '#1e1b4b';

      // '1'
      strokes.push(makeStroke([[x, y], [x, y + 40]], c, w));
      x += 16;
      // '8' (figure-8)
      strokes.push(makeStroke([
        [x + 12, y + 10], [x + 5, y], [x, y + 10], [x + 15, y + 30],
        [x + 10, y + 40], [x, y + 30], [x + 12, y + 10]
      ], c, w));
      x += 32;

      // '+' (two crossing strokes)
      strokes.push(makeStroke([[x + 10, y + 10], [x + 10, y + 30]], c, w));
      strokes.push(makeStroke([[x, y + 20], [x + 20, y + 20]], c, w));
      x += 35;

      // '4' (two strokes)
      strokes.push(makeStroke([[x + 12, y + 5], [x, y + 25], [x + 18, y + 25]], c, w));
      strokes.push(makeStroke([[x + 14, y + 10], [x + 14, y + 38]], c, w));
      x += 32;

      // '*' / 'x' (two crossing diagonals)
      strokes.push(makeStroke([[x + 2, y + 10], [x + 18, y + 30]], c, w));
      strokes.push(makeStroke([[x + 18, y + 10], [x + 2, y + 30]], c, w));
      x += 32;

      // '3'
      strokes.push(makeStroke([
        [x, y + 5], [x + 12, y + 5], [x + 5, y + 20], [x + 15, y + 25], [x + 10, y + 40], [x, y + 38]
      ], c, w));
      x += 32;

      // '=' (two parallel horizontal bars)
      strokes.push(makeStroke([[x, y + 16], [x + 22, y + 16]], c, w));
      strokes.push(makeStroke([[x, y + 26], [x + 22, y + 26]], c, w));

      return strokes;
    },
  },
  {
    id: 'div_zero',
    name: '24 / 0 =',
    description: 'Division by zero fault-tolerance test (Undefined)',
    generateStrokes: (sx, sy) => {
      const strokes: Stroke[] = [];
      let x = sx;
      const y = sy;
      const w = 3.5;
      const c = '#1e1b4b';

      // '2'
      strokes.push(makeStroke([
        [x, y + 10], [x + 10, y], [x + 18, y + 10], [x, y + 40], [x + 20, y + 40]
      ], c, w));
      x += 30;

      // '4'
      strokes.push(makeStroke([[x + 12, y + 5], [x, y + 25], [x + 18, y + 25]], c, w));
      strokes.push(makeStroke([[x + 14, y + 10], [x + 14, y + 38]], c, w));
      x += 35;

      // '/'
      strokes.push(makeStroke([[x + 18, y + 5], [x + 2, y + 40]], c, w));
      x += 30;

      // '0'
      strokes.push(makeStroke([
        [x + 10, y], [x, y + 15], [x + 5, y + 35], [x + 15, y + 35], [x + 18, y + 15], [x + 10, y]
      ], c, w));
      x += 30;

      // '='
      strokes.push(makeStroke([[x, y + 16], [x + 22, y + 16]], c, w));
      strokes.push(makeStroke([[x, y + 26], [x + 22, y + 26]], c, w));

      return strokes;
    },
  },
  {
    id: 'curve_plot',
    name: 'y = x ^ 2',
    description: '2D Function curve graphing',
    generateStrokes: (sx, sy) => {
      const strokes: Stroke[] = [];
      let x = sx;
      const y = sy;
      const w = 3.5;
      const c = '#1e1b4b';

      // 'y'
      strokes.push(makeStroke([[x, y + 8], [x + 8, y + 24]], c, w));
      strokes.push(makeStroke([[x + 16, y + 8], [x, y + 45]], c, w));
      x += 30;

      // '='
      strokes.push(makeStroke([[x, y + 16], [x + 22, y + 16]], c, w));
      strokes.push(makeStroke([[x, y + 26], [x + 22, y + 26]], c, w));
      x += 35;

      // 'x'
      strokes.push(makeStroke([[x + 2, y + 10], [x + 18, y + 35]], c, w));
      strokes.push(makeStroke([[x + 18, y + 10], [x + 2, y + 35]], c, w));
      x += 30;

      // '^'
      strokes.push(makeStroke([[x, y + 18], [x + 9, y + 6], [x + 18, y + 18]], c, w));
      x += 26;

      // '2'
      strokes.push(makeStroke([
        [x, y + 10], [x + 10, y], [x + 18, y + 10], [x, y + 40], [x + 20, y + 40]
      ], c, w));

      return strokes;
    },
  },
  {
    id: 'trig_cos',
    name: 'cos(0) =',
    description: 'Trigonometric evaluation (1)',
    generateStrokes: (sx, sy) => {
      const strokes: Stroke[] = [];
      let x = sx;
      const y = sy;
      const w = 3.5;
      const c = '#1e1b4b';

      // 'c'
      strokes.push(makeStroke([[x + 18, y + 8], [x + 5, y + 16], [x + 5, y + 30], [x + 18, y + 38]], c, w));
      x += 26;

      // 'o'
      strokes.push(makeStroke([[x + 10, y + 10], [x, y + 20], [x + 10, y + 38], [x + 20, y + 20], [x + 10, y + 10]], c, w));
      x += 26;

      // 's'
      strokes.push(makeStroke([[x + 16, y + 10], [x + 5, y + 16], [x + 15, y + 26], [x + 4, y + 38]], c, w));
      x += 24;

      // '('
      strokes.push(makeStroke([[x + 10, y + 5], [x + 2, y + 22], [x + 10, y + 42]], c, w));
      x += 16;

      // '0'
      strokes.push(makeStroke([[x + 10, y + 8], [x, y + 22], [x + 10, y + 40], [x + 18, y + 22], [x + 10, y + 8]], c, w));
      x += 24;

      // ')'
      strokes.push(makeStroke([[x + 2, y + 5], [x + 10, y + 22], [x + 2, y + 42]], c, w));
      x += 20;

      // '='
      strokes.push(makeStroke([[x, y + 18], [x + 22, y + 18]], c, w));
      strokes.push(makeStroke([[x, y + 28], [x + 22, y + 28]], c, w));

      return strokes;
    },
  },
  {
    id: 'linear_algebra',
    name: '3x + 5 = 7',
    description: 'Solves algebraic equation for x = 2/3 (0.67)',
    generateStrokes: (sx, sy) => {
      const strokes: Stroke[] = [];
      let x = sx;
      const y = sy;
      const w = 3.5;
      const c = '#1e1b4b';

      // '3'
      strokes.push(makeStroke([
        [x, y + 5], [x + 12, y + 5], [x + 5, y + 20], [x + 15, y + 25], [x + 10, y + 40], [x, y + 38]
      ], c, w));
      x += 28;

      // 'x'
      strokes.push(makeStroke([[x + 2, y + 12], [x + 18, y + 35]], c, w));
      strokes.push(makeStroke([[x + 18, y + 12], [x + 2, y + 35]], c, w));
      x += 28;

      // '+'
      strokes.push(makeStroke([[x + 10, y + 10], [x + 10, y + 30]], c, w));
      strokes.push(makeStroke([[x, y + 20], [x + 20, y + 20]], c, w));
      x += 30;

      // '5'
      strokes.push(makeStroke([
        [x + 16, y + 8], [x + 2, y + 8], [x + 2, y + 22], [x + 15, y + 22], [x + 16, y + 38], [x, y + 38]
      ], c, w));
      x += 28;

      // '='
      strokes.push(makeStroke([[x, y + 18], [x + 20, y + 18]], c, w));
      strokes.push(makeStroke([[x, y + 28], [x + 20, y + 28]], c, w));
      x += 32;

      // '7'
      strokes.push(makeStroke([
        [x, y + 8], [x + 18, y + 8], [x + 4, y + 40]
      ], c, w));

      return strokes;
    },
  },
];



function makeStroke(pts: [number, number][], color: string, width: number): Stroke {
  const points: Point[] = pts.map(([x, y]) => ({ x, y, pressure: 0.5, time: Date.now() }));
  return {
    id: `stroke_${Math.random().toString(36).substring(2, 9)}`,
    points,
    color,
    width,
    tool: 'pen',
    timestamp: Date.now(),
    bounds: computeBoundingBox(points),
  };
}
