/**
 * Smart_Ink Stroke Geometry & Rendering Utilities
 * Handles bounds, distance math, Bézier smoothing, SVG path generation,
 * stroke/pixel collision, and scratch-to-erase gesture recognition.
 */

import { Point, BoundingBox, Stroke } from './types';
import { getStroke } from 'perfect-freehand';

/**
 * Calculates tight axis-aligned bounding box for a set of points
 */
export function computeBoundingBox(points: Point[]): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Merges multiple bounding boxes into one enclosing box
 */
export function mergeBoundingBoxes(boxes: BoundingBox[]): BoundingBox {
  if (boxes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of boxes) {
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
  };
}

/**
 * Checks if two bounding boxes overlap or are within a given spatial threshold
 */
export function boxesIntersect(a: BoundingBox, b: BoundingBox, margin: number = 0): boolean {
  return !(
    a.maxX + margin < b.minX ||
    a.minX - margin > b.maxX ||
    a.maxY + margin < b.minY ||
    a.minY - margin > b.maxY
  );
}

/**
 * Euclidean distance between two points
 */
export function pointDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Shortest distance from a point to a line segment
 */
export function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (w.x - v.x) * (w.x - v.x) + (w.y - v.y) * (w.y - v.y);
  if (l2 === 0) return pointDistance(p, v);

  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);
  return pointDistance(p, { x: projX, y: projY });
}

/**
 * Checks if a point with radius intersects any segment of a stroke
 */
export function strokeIntersectsCircle(stroke: Stroke, center: Point, radius: number): boolean {
  // Quick AABB rejection test with radius margin
  if (
    center.x + radius < stroke.bounds.minX ||
    center.x - radius > stroke.bounds.maxX ||
    center.y + radius < stroke.bounds.minY ||
    center.y - radius > stroke.bounds.maxY
  ) {
    return false;
  }

  const points = stroke.points;
  if (points.length === 0) return false;
  if (points.length === 1) {
    return pointDistance(center, points[0]) <= radius + stroke.width / 2;
  }

  const threshold = radius + stroke.width / 2;
  for (let i = 0; i < points.length - 1; i++) {
    if (distToSegment(center, points[i], points[i + 1]) <= threshold) {
      return true;
    }
  }

  return false;
}

/**
 * Generates an SVG path data string from perfect-freehand outline points
 */
export function getSvgPathFromStroke(strokeOutline: number[][]): string {
  if (!strokeOutline.length) return '';

  const d: string[] = [];
  const [firstX, firstY] = strokeOutline[0];
  d.push(`M ${firstX.toFixed(1)} ${firstY.toFixed(1)} Q`);

  for (let i = 0; i < strokeOutline.length; i++) {
    const [p0x, p0y] = strokeOutline[i];
    const [p1x, p1y] = strokeOutline[(i + 1) % strokeOutline.length];
    d.push(
      `${p0x.toFixed(1)} ${p0y.toFixed(1)} ${((p0x + p1x) / 2).toFixed(1)} ${(
        (p0y + p1y) / 2
      ).toFixed(1)}`
    );
  }

  d.push('Z');
  return d.join(' ');
}

/**
 * Renders a stroke directly onto an HTML5 2D Canvas context with pressure-sensitive ink curves
 */
export function drawStrokeOnContext(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length === 0) return;

  const isHighlighter = stroke.tool === 'highlighter';
  const size = isHighlighter ? stroke.width * 2.5 : stroke.width;

  ctx.save();

  if (isHighlighter) {
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = 'multiply';
  } else {
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.fillStyle = stroke.color;

  if (stroke.points.length === 1) {
    // Single dot or decimal point
    const p = stroke.points[0];
    const r = Math.max(size / 2, 2.5);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Use perfect-freehand for natural variable-width calligraphic ink curves
  const inputPoints = stroke.points.map((p) => [p.x, p.y, p.pressure ?? 0.5]);
  const outline = getStroke(inputPoints, {
    size,
    thinning: isHighlighter ? 0.1 : 0.45,
    smoothing: 0.65,
    streamline: 0.55,
    simulatePressure: stroke.points.every((p) => p.pressure === undefined || p.pressure === 0.5),
  });

  if (outline.length > 0) {
    ctx.beginPath();
    ctx.moveTo(outline[0][0], outline[0][1]);
    for (let i = 1; i < outline.length; i++) {
      ctx.lineTo(outline[i][0], outline[i][1]);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Detects scratch-to-erase gesture.
 * If user draws a rapid zig-zag scribbling stroke with >= 3 direction reversals
 * in a compact spatial area, it is classified as a scratch gesture.
 */
export function detectScratchGesture(points: Point[]): { isScratch: boolean; bounds: BoundingBox } {
  if (points.length < 8) {
    return { isScratch: false, bounds: computeBoundingBox([]) };
  }

  const bounds = computeBoundingBox(points);
  // Must be reasonably bounded (not a giant line across the whole screen)
  if (bounds.width > 300 || bounds.height > 200) {
    return { isScratch: false, bounds };
  }

  // Count horizontal direction reversals
  let reversals = 0;
  let lastDir = 0; // -1 for left, 1 for right

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    if (Math.abs(dx) > 3) {
      const dir = dx > 0 ? 1 : -1;
      if (lastDir !== 0 && dir !== lastDir) {
        reversals++;
      }
      lastDir = dir;
    }
  }

  // Also calculate total path length vs bounding box diagonal
  let totalLength = 0;
  for (let i = 1; i < points.length; i++) {
    totalLength += pointDistance(points[i], points[i - 1]);
  }

  const diagonal = Math.sqrt(bounds.width * bounds.width + bounds.height * bounds.height);
  const denseScribble = totalLength > diagonal * 3.0;

  const isScratch = reversals >= 4 || (reversals >= 3 && denseScribble);

  return {
    isScratch,
    bounds,
  };
}
