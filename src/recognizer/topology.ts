/**
 * Smart_Ink Topological & Stroke Trajectory Feature Analyzer
 * Analyzes digital ink strokes by trajectory, intersections, loops, and curvature.
 * Provides high-speed, deterministic recognition for mathematical symbols.
 */

import { Point, Stroke, BoundingBox } from '../canvas/types';
import { computeBoundingBox, pointDistance } from '../canvas/strokeUtils';

export interface StrokeFeatures {
  strokeCount: number;
  totalPoints: number;
  bounds: BoundingBox;
  aspectRatio: number; // width / height
  pathLength: number;
  isDot: boolean;
  isStraightLine: boolean;
  lineAngle: number; // in degrees
  hasLoop: boolean;
  loopLocation: 'top' | 'bottom' | 'middle' | 'full' | 'none';
  crossings: number;
  isParallelHorizontals: boolean;
}

export function extractStrokeFeatures(strokes: Stroke[]): StrokeFeatures {
  const allPoints: Point[] = strokes.flatMap((s) => s.points);
  const bounds = computeBoundingBox(allPoints);
  const aspectRatio = bounds.width / Math.max(bounds.height, 1);

  let pathLength = 0;
  for (const s of strokes) {
    for (let i = 1; i < s.points.length; i++) {
      pathLength += pointDistance(s.points[i], s.points[i - 1]);
    }
  }

  // Is it a dot or decimal point?
  const isDot =
    strokes.length === 1 && bounds.width <= 14 && bounds.height <= 14 && pathLength < 30;


  // Check straight line (for 1, -, /)
  let isStraightLine = false;
  let lineAngle = 0;
  if (strokes.length === 1 && allPoints.length >= 2) {
    const start = allPoints[0];
    const end = allPoints[allPoints.length - 1];
    const directDist = pointDistance(start, end);
    // Straight line if direct distance is very close to path length
    if (directDist > 0 && directDist / pathLength > 0.82) {
      isStraightLine = true;
      lineAngle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
    }
  }

  // Detect two roughly parallel horizontal lines for '='
  let isParallelHorizontals = false;
  if (strokes.length === 2) {
    const b0 = strokes[0].bounds;
    const b1 = strokes[1].bounds;
    const bothWide = b0.width > b0.height * 1.2 && b1.width > b1.height * 1.2;
    const verticallyStacked =
      Math.abs(b0.centerX - b1.centerX) < Math.max(b0.width, b1.width) * 0.7 &&
      Math.abs(b0.centerY - b1.centerY) > 4;
    if (bothWide && verticallyStacked) {
      isParallelHorizontals = true;
    }
  }

  // Check loops by finding self-intersections or closure
  let hasLoop = false;
  let loopLocation: 'top' | 'bottom' | 'middle' | 'full' | 'none' = 'none';

  if (strokes.length === 1 && allPoints.length >= 6) {
    const start = allPoints[0];
    const end = allPoints[allPoints.length - 1];
    const startEndDist = pointDistance(start, end);

    // Closed loop if start and end are close compared to path length
    if (startEndDist < pathLength * 0.35 || startEndDist < 20) {
      hasLoop = true;
      loopLocation = 'full';
    } else {
      // Check if start or end loops in top or bottom
      const yMid = bounds.centerY;
      if (start.y > yMid && end.y < yMid && startEndDist < pathLength * 0.45) {
        hasLoop = true;
        loopLocation = 'top';
      } else if (start.y < yMid && end.y > yMid && startEndDist < pathLength * 0.45) {
        hasLoop = true;
        loopLocation = 'bottom';
      }
    }
  }

  // Detect crossing strokes (for +, x)
  let crossings = 0;
  if (strokes.length === 2) {
    const s0 = strokes[0].points;
    const s1 = strokes[1].points;
    if (s0.length >= 2 && s1.length >= 2) {
      const b0 = strokes[0].bounds;
      const b1 = strokes[1].bounds;
      // If centers overlap and one is mostly vertical, one mostly horizontal -> '+'
      const overlapX = Math.abs(b0.centerX - b1.centerX) < Math.min(b0.width, b1.width) * 0.6;
      const overlapY = Math.abs(b0.centerY - b1.centerY) < Math.min(b0.height, b1.height) * 0.6;
      if (overlapX && overlapY) {
        crossings = 1;
      }
    }
  }

  return {
    strokeCount: strokes.length,
    totalPoints: allPoints.length,
    bounds,
    aspectRatio,
    pathLength,
    isDot,
    isStraightLine,
    lineAngle,
    hasLoop,
    loopLocation,
    crossings,
    isParallelHorizontals,
  };
}

/**
 * Geometric classifier for math characters
 */
export function classifyByTopology(strokes: Stroke[]): { char: string; confidence: number } {
  if (strokes.length === 0) return { char: '', confidence: 0 };

  const feat = extractStrokeFeatures(strokes);
  const allPoints = strokes.flatMap((s) => s.points);
  const b = feat.bounds;

  // 1. Check dot / decimal point (.)
  if (feat.isDot) {
    return { char: '.', confidence: 0.96 };
  }

  // 2. Check equals sign (=)
  if (feat.isParallelHorizontals) {
    return { char: '=', confidence: 0.98 };
  }

  // 3. Check plus sign (+) vs multiply (x)
  if (feat.crossings >= 1 || (strokes.length === 2 && feat.aspectRatio > 0.6 && feat.aspectRatio < 1.6)) {
    const s0 = strokes[0];
    const s1 = strokes[1];
    if (s0 && s1) {
      const b0 = s0.bounds;
      const b1 = s1.bounds;
      const oneHorizOneVert =
        (b0.width > b0.height * 1.3 && b1.height > b1.width * 1.3) ||
        (b1.width > b1.height * 1.3 && b0.height > b0.width * 1.3);

      if (oneHorizOneVert) {
        return { char: '+', confidence: 0.95 };
      }
      // If both are diagonal crossing lines -> 'x' or '*'
      return { char: 'x', confidence: 0.92 };
    }
  }

  // 4. Check minus sign (-)
  if (strokes.length === 1 && feat.aspectRatio > 1.8 && feat.bounds.height < 35) {
    return { char: '-', confidence: 0.95 };
  }

  // 5. Check division sign (÷) : horizontal bar with 2 dots or 3 strokes
  if (strokes.length === 3) {
    const horizStroke = strokes.find((s) => s.bounds.width > s.bounds.height * 1.4);
    if (horizStroke) {
      return { char: '/', confidence: 0.94 };
    }
  }

  // 6. Check single stroke characters
  if (strokes.length === 1 && allPoints.length >= 2) {
    const start = allPoints[0];
    const end = allPoints[allPoints.length - 1];

    // Straight vertical line -> 1
    if (feat.isStraightLine && feat.aspectRatio < 0.38) {
      return { char: '1', confidence: 0.95 };
    }

    // Straight forward slash / division -> /
    if (feat.isStraightLine && feat.aspectRatio >= 0.38 && feat.aspectRatio <= 1.4) {
      if ((feat.lineAngle > 30 && feat.lineAngle < 80) || (feat.lineAngle < -100 && feat.lineAngle > -160)) {
        return { char: '/', confidence: 0.92 };
      }
    }

    // Curved Parentheses: ( or )
    if (feat.aspectRatio < 0.65 && !feat.hasLoop) {
      const midPoint = allPoints[Math.floor(allPoints.length / 2)];
      if (midPoint.x < start.x - 4 && midPoint.x < end.x - 4) {
        return { char: '(', confidence: 0.92 };
      }
      if (midPoint.x > start.x + 4 && midPoint.x > end.x + 4) {
        return { char: ')', confidence: 0.92 };
      }
    }

    // Full loop -> 0
    if (feat.hasLoop && feat.loopLocation === 'full' && feat.aspectRatio > 0.45 && feat.aspectRatio < 1.4) {
      return { char: '0', confidence: 0.93 };
    }

    // Check bottom loop -> 6
    if (feat.hasLoop && feat.loopLocation === 'bottom') {
      return { char: '6', confidence: 0.91 };
    }

    // Check top loop -> 9
    if (feat.hasLoop && feat.loopLocation === 'top') {
      return { char: '9', confidence: 0.91 };
    }

    // Check 7: starts top-left, moves right, then slants down-left
    if (start.y < b.minY + b.height * 0.35 && end.y > b.maxY - b.height * 0.35) {
      const topPoints = allPoints.slice(0, Math.floor(allPoints.length * 0.3));
      const hasTopBar = topPoints.some((p) => p.x > start.x + b.width * 0.5);
      if (hasTopBar && end.x < b.centerX + 5) {
        return { char: '7', confidence: 0.91 };
      }
    }

    // Check 2: starts top with hook, moves down-left, ends with bottom horizontal bar
    if (start.y < b.centerY && end.y > b.maxY - b.height * 0.25 && end.x > start.x) {
      return { char: '2', confidence: 0.88 };
    }

    // Check 3: two convex curves on the right side
    let rightBumps = 0;
    for (let i = 2; i < allPoints.length - 2; i++) {
      if (
        allPoints[i].x > b.maxX - b.width * 0.25 &&
        allPoints[i - 2].x < allPoints[i].x &&
        allPoints[i + 2].x < allPoints[i].x
      ) {
        rightBumps++;
      }
    }
    if (rightBumps >= 1 && feat.aspectRatio > 0.45 && feat.aspectRatio < 1.1) {
      return { char: '3', confidence: 0.87 };
    }

    // Check power/caret (^)
    if (feat.aspectRatio > 0.6 && feat.aspectRatio < 1.6) {
      const peak = allPoints.reduce((minP, p) => (p.y < minP.y ? p : minP), allPoints[0]);
      if (peak.y < start.y - 8 && peak.y < end.y - 8 && Math.abs(start.y - end.y) < b.height * 0.4) {
        return { char: '^', confidence: 0.90 };
      }
    }
  }

  // 7. Check 4: two strokes or single stroke with L + vertical
  if (strokes.length === 2) {
    const s0 = strokes[0].bounds;
    const s1 = strokes[1].bounds;
    if (s1.height > s1.width * 2 && s0.width > s0.height * 0.6) {
      return { char: '4', confidence: 0.90 };
    }
  }

  // Fallback default
  return { char: '?', confidence: 0.2 };
}
