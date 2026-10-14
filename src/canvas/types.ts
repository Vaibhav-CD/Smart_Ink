import { EvalResult } from '../engine/parser';
import { PlotData } from '../engine/plotter';

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export type InkTool = 'pen' | 'highlighter' | 'eraser_stroke' | 'eraser_pixel';

export type PaperStyle =
  | 'ruled'
  | 'grid'
  | 'dot'
  | 'blank'
  | 'dark-grid'
  | 'dark-blank';

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: InkTool;
  timestamp: number;
  bounds: BoundingBox;
}

export interface CharacterCluster {
  id: string;
  strokeIds: string[];
  bounds: BoundingBox;
  char?: string;
  confidence?: number;
}

export interface RecognizedEquation {
  id: string;
  strokeIds: string[];
  bounds: BoundingBox;
  rawExpression: string;
  evalResult: EvalResult;
  equalsSignBounds?: BoundingBox;
  projectionAnchor: Point;
  confidence: number;
  isPlottable: boolean;
  plotData: PlotData | null;
  lastUpdated: number;
}
