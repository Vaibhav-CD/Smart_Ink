/**
 * Smart_Ink Spatial Equation Segmenter & Pipeline
 * Groups freehand strokes into lines, clusters multi-stroke symbols (e.g. '=', '+', 'x'),
 * extracts math expressions, and determines inline projection coordinates.
 */

import { Stroke, BoundingBox, CharacterCluster, RecognizedEquation, Point } from '../canvas/types';
import { computeBoundingBox, mergeBoundingBoxes, boxesIntersect } from '../canvas/strokeUtils';
import { HybridMathClassifier } from './classifier';
import { MathEngine } from '../engine/parser';
import { FunctionPlotter } from '../engine/plotter';
import { QuestionSolver } from '../engine/questionSolver';


export class EquationSegmenter {
  /**
   * Main pipeline: processes all canvas strokes and discovers recognized equations
   */
  public static processStrokes(
    strokes: Stroke[],
    mathEngine: MathEngine
  ): RecognizedEquation[] {
    // Ignore highlighter strokes and eraser marks from recognition
    const inkStrokes = strokes.filter(
      (s) => s.tool === 'pen' && s.points.length > 0
    );

    if (inkStrokes.length === 0) return [];

    // 1. Cluster strokes into lines of equations
    const equationLines = this.clusterIntoLines(inkStrokes);

    const equations: RecognizedEquation[] = [];

    for (let lineIndex = 0; lineIndex < equationLines.length; lineIndex++) {
      const lineStrokes = equationLines[lineIndex];
      const eq = this.processSingleLine(lineStrokes, `eq_${lineIndex}`, mathEngine);
      if (eq) {
        equations.push(eq);
      }
    }

    return equations;
  }

  /**
   * Groups strokes into lines based on vertical proximity and overlap
   */
  private static clusterIntoLines(strokes: Stroke[]): Stroke[][] {
    if (strokes.length === 0) return [];

    // Sort strokes primarily by vertical center
    const sorted = [...strokes].sort((a, b) => a.bounds.centerY - b.bounds.centerY);

    const lines: Stroke[][] = [];

    for (const stroke of sorted) {
      let placed = false;
      const sb = stroke.bounds;

      for (const line of lines) {
        const lineBounds = mergeBoundingBoxes(line.map((s) => s.bounds));
        const avgHeight = Math.max(lineBounds.height, sb.height, 20);

        // Check vertical overlap or close vertical proximity
        const verticalDist = Math.abs(sb.centerY - lineBounds.centerY);
        const verticalOverlap =
          Math.min(sb.maxY, lineBounds.maxY) - Math.max(sb.minY, lineBounds.minY);

        if (verticalOverlap > 0 || verticalDist < avgHeight * 0.75) {
          line.push(stroke);
          placed = true;
          break;
        }
      }

      if (!placed) {
        lines.push([stroke]);
      }
    }

    return lines;
  }

  /**
   * Analyzes a single line of strokes
   */
  private static processSingleLine(
    lineStrokes: Stroke[],
    eqId: string,
    mathEngine: MathEngine
  ): RecognizedEquation | null {
    if (lineStrokes.length === 0) return null;

    // Cluster strokes into characters (combines '=' 2-bars, '+' crossing, etc.)
    const charClusters = this.clusterCharacters(lineStrokes);

    // Sort character clusters strictly from left to right
    charClusters.sort((a, b) => a.bounds.minX - b.bounds.minX);

    // Classify each cluster
    let rawExpr = '';
    let hasEquals = false;
    let equalsBounds: BoundingBox | undefined;
    let totalConfidence = 0;

    for (const cluster of charClusters) {
      const strokesInCluster = lineStrokes.filter((s) => cluster.strokeIds.includes(s.id));
      const res = HybridMathClassifier.classify(strokesInCluster);

      cluster.char = res.char;
      cluster.confidence = res.confidence;
      totalConfidence += res.confidence;

      rawExpr += res.char;
      if (res.char === '=') {
        hasEquals = true;
        equalsBounds = cluster.bounds;
      }
    }

    // Check if plottable or if it has an equals sign
    const isPlottable = FunctionPlotter.isPlottable(rawExpr);
    if (!hasEquals && !isPlottable) {
      // Check for natural language question (e.g. "what is the value of cos(0)")
      const qSol = QuestionSolver.solve(rawExpr);
      if (qSol.isSuccess && qSol.detectedType !== 'general') {
        const lineBounds = mergeBoundingBoxes(lineStrokes.map((s) => s.bounds));
        return {
          id: eqId,
          strokeIds: lineStrokes.map((s) => s.id),
          bounds: lineBounds,
          rawExpression: rawExpr,
          evalResult: {
            status: 'success',
            displayText: qSol.result,
            expressionString: rawExpr,
          },
          projectionAnchor: {
            x: lineBounds.maxX + 14,
            y: lineBounds.centerY,
          },
          confidence: charClusters.length > 0 ? totalConfidence / charClusters.length : 0.9,
          isPlottable: false,
          plotData: null,
          lastUpdated: Date.now(),
        };
      }
      return null;
    }


    const lineBounds = mergeBoundingBoxes(lineStrokes.map((s) => s.bounds));
    const avgConfidence = charClusters.length > 0 ? totalConfidence / charClusters.length : 0;

    // 1. Check if it's a linear algebraic equation (e.g. "3x+5=7", "2x-4=10", "solve 5x=25")
    const linearSol = QuestionSolver.solve(rawExpr);
    let evalResult: any;
    let anchor: Point;

    if (linearSol.isSuccess && linearSol.detectedType === 'linear_equation') {
      if (linearSol.variableName && linearSol.variableValue !== undefined && !isNaN(linearSol.variableValue)) {
        mathEngine.setVariable(linearSol.variableName, linearSol.variableValue);
      }
      evalResult = {
        status: 'success',
        value: linearSol.variableValue,
        displayText: linearSol.result,
        expressionString: rawExpr,
      };
      // Place anchor at the end of the entire equation (e.g. to the right of "7")
      anchor = {
        x: lineBounds.maxX + 14,
        y: lineBounds.centerY,
      };
    } else {
      // Evaluate standard arithmetic or assignment expression
      evalResult = mathEngine.evaluate(rawExpr);

      // Determine projection point (directly adjacent to the '=' sign, or right side of line)
      if (equalsBounds && Math.abs(equalsBounds.maxX - lineBounds.maxX) < 25) {
        anchor = {
          x: equalsBounds.maxX + 14,
          y: equalsBounds.centerY,
        };
      } else {
        anchor = {
          x: lineBounds.maxX + 14,
          y: lineBounds.centerY,
        };
      }
    }


    // Plot data if 2D curve
    const plotData = isPlottable ? FunctionPlotter.generatePlot(rawExpr) : null;

    return {
      id: eqId,
      strokeIds: lineStrokes.map((s) => s.id),
      bounds: lineBounds,
      rawExpression: rawExpr,
      evalResult,
      equalsSignBounds: equalsBounds,
      projectionAnchor: anchor,
      confidence: avgConfidence,
      isPlottable,
      plotData,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Clusters multi-stroke characters within a line (e.g. '=' 2-strokes, '+' 2-strokes, '÷' 3-strokes)
   */
  private static clusterCharacters(strokes: Stroke[]): CharacterCluster[] {
    const clusters: CharacterCluster[] = [];
    const used = new Set<string>();

    for (let i = 0; i < strokes.length; i++) {
      const s1 = strokes[i];
      if (used.has(s1.id)) continue;

      const group: Stroke[] = [s1];
      used.add(s1.id);

      for (let j = i + 1; j < strokes.length; j++) {
        const s2 = strokes[j];
        if (used.has(s2.id)) continue;

        // Check if s1 and s2 should be clustered together
        if (this.shouldClusterTogether(s1, s2, group)) {
          group.push(s2);
          used.add(s2.id);
        }
      }

      const clusterBounds = mergeBoundingBoxes(group.map((s) => s.bounds));
      clusters.push({
        id: `char_${clusters.length}`,
        strokeIds: group.map((s) => s.id),
        bounds: clusterBounds,
      });
    }

    return clusters;
  }

  private static shouldClusterTogether(s1: Stroke, s2: Stroke, currentGroup: Stroke[]): boolean {
    const b1 = s1.bounds;
    const b2 = s2.bounds;

    // 1. Two parallel horizontal strokes -> '=' sign
    const bothHoriz = b1.width > b1.height * 1.2 && b2.width > b2.height * 1.2;
    const xOverlap =
      Math.min(b1.maxX, b2.maxX) - Math.max(b1.minX, b2.minX);
    const minW = Math.min(b1.width, b2.width);

    if (bothHoriz && xOverlap > minW * 0.5) {
      const verticalGap = Math.abs(b1.centerY - b2.centerY);
      if (verticalGap > 4 && verticalGap < Math.max(b1.width, b2.width) * 1.2) {
        return true;
      }
    }

    // 2. Crossing strokes -> '+' or 'x'
    if (boxesIntersect(b1, b2, 4)) {
      const centerDistX = Math.abs(b1.centerX - b2.centerX);
      const centerDistY = Math.abs(b1.centerY - b2.centerY);
      const avgSize = (Math.max(b1.width, b1.height) + Math.max(b2.width, b2.height)) / 2;

      if (centerDistX < avgSize * 0.5 && centerDistY < avgSize * 0.5) {
        return true;
      }
    }

    // 3. Dot above or below (for ÷, i)
    const isS1Dot = b1.width <= 14 && b1.height <= 14;
    const isS2Dot = b2.width <= 14 && b2.height <= 14;
    if ((isS1Dot || isS2Dot) && Math.abs(b1.centerX - b2.centerX) < 20) {
      const yDist = Math.abs(b1.centerY - b2.centerY);
      if (yDist < 40) return true;
    }

    return false;
  }
}
