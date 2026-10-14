/**
 * Smart_Ink Interactive Digital Ink Canvas
 * Ultra low-latency, 60 FPS locked drawing canvas with high-DPI scaling,
 * pressure-sensitive ink rendering, dual eraser modes, and off-thread Web Worker inference.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stroke, Point, InkTool, PaperStyle, RecognizedEquation } from '../canvas/types';
import {
  computeBoundingBox,
  drawStrokeOnContext,
  strokeIntersectsCircle,
  detectScratchGesture,
  boxesIntersect,
} from '../canvas/strokeUtils';
import { soundFX } from '../canvas/audio';
import { InlineProjection } from './InlineProjection';
import { GraphModal } from './GraphModal';
import { PlotData } from '../engine/plotter';

interface CanvasProps {
  tool: InkTool;
  color: string;
  width: number;
  paperStyle: PaperStyle;
  soundEnabled: boolean;
  onVariablesChange: (vars: Record<string, number>) => void;
  undoTrigger?: number;
  redoTrigger?: number;
  clearTrigger?: number;
  sampleEquationTrigger?: { id: number; text: string; strokes: Stroke[] };
  onUndoRedoStateChange?: (canUndo: boolean, canRedo: boolean) => void;
}

export const Canvas: React.FC<CanvasProps> = ({
  tool,
  color,
  width,
  paperStyle,
  soundEnabled,
  onVariablesChange,
  undoTrigger,
  redoTrigger,
  clearTrigger,
  sampleEquationTrigger,
  onUndoRedoStateChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Stroke state & Undo/Redo stacks
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  // Recognized equations & Web Worker
  const [equations, setEquations] = useState<RecognizedEquation[]>([]);
  const [activePlot, setActivePlot] = useState<PlotData | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Drawing tracking
  const isDrawing = useRef(false);
  const currentPoints = useRef<Point[]>([]);
  const activeStrokeId = useRef<string | null>(null);
  const rafId = useRef<number | null>(null);

  // Sync sound settings
  useEffect(() => {
    soundFX.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // Initialize Web Worker for non-blocking 60 FPS recognition
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/mathWorker.ts', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e: MessageEvent) => {
      const { type, equations: newEquations, variables } = e.data;
      if (type === 'EQUATIONS_RECOGNIZED') {
        setEquations(newEquations);
        onVariablesChange(variables);
        if (newEquations.length > 0 && newEquations.some((eq: RecognizedEquation) => eq.evalResult.status === 'success')) {
          soundFX.playSolveChime();
        }
      }
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, [onVariablesChange]);

  // Dispatch strokes to Web Worker
  const dispatchToWorker = useCallback((currentStrokes: Stroke[]) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'PROCESS_STROKES',
        strokes: currentStrokes,
      });
    }
  }, []);

  // Update undo/redo availability
  useEffect(() => {
    onUndoRedoStateChange?.(strokes.length > 0, redoStack.length > 0);
  }, [strokes, redoStack, onUndoRedoStateChange]);

  // Undo / Redo triggers
  useEffect(() => {
    if (undoTrigger && strokes.length > 0) {
      const last = strokes[strokes.length - 1];
      const newStrokes = strokes.slice(0, -1);
      setRedoStack((prev) => [...prev, [last]]);
      setStrokes(newStrokes);
      dispatchToWorker(newStrokes);
      soundFX.playEraseSound();
    }
  }, [undoTrigger, dispatchToWorker]);

  useEffect(() => {
    if (redoTrigger && redoStack.length > 0) {
      const nextStrokeGroup = redoStack[redoStack.length - 1];
      const newRedo = redoStack.slice(0, -1);
      const newStrokes = [...strokes, ...nextStrokeGroup];
      setRedoStack(newRedo);
      setStrokes(newStrokes);
      dispatchToWorker(newStrokes);
    }
  }, [redoTrigger, dispatchToWorker]);

  useEffect(() => {
    if (clearTrigger) {
      setStrokes([]);
      setEquations([]);
      setRedoStack([]);
      dispatchToWorker([]);
      soundFX.playEraseSound();
    }
  }, [clearTrigger, dispatchToWorker]);

  // Sample equation trigger
  useEffect(() => {
    if (sampleEquationTrigger && sampleEquationTrigger.strokes.length > 0) {
      setStrokes((prev) => {
        const next = [...prev, ...sampleEquationTrigger.strokes];
        dispatchToWorker(next);
        return next;
      });
    }
  }, [sampleEquationTrigger, dispatchToWorker]);

  // Handle Canvas High-DPI Scaling & Resizing
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    renderCanvas();
  }, [strokes]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [resizeCanvas]);

  // 60 FPS Render loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Draw committed strokes
    for (const stroke of strokes) {
      drawStrokeOnContext(ctx, stroke);
    }

    // Draw current active stroke being drawn
    if (isDrawing.current && currentPoints.current.length > 0) {
      const activeStroke: Stroke = {
        id: 'active',
        points: currentPoints.current,
        color,
        width,
        tool,
        timestamp: Date.now(),
        bounds: computeBoundingBox(currentPoints.current),
      };
      drawStrokeOnContext(ctx, activeStroke);
    }

    ctx.restore();
  }, [strokes, color, width, tool]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    isDrawing.current = true;

    const rect = canvas.getBoundingClientRect();
    const p: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
      time: Date.now(),
    };

    currentPoints.current = [p];
    activeStrokeId.current = `stroke_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (tool === 'eraser_stroke' || tool === 'eraser_pixel') {
      handleEraser(p);
    }

    renderCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const p: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure > 0 ? e.pressure : 0.5,
      time: Date.now(),
    };

    currentPoints.current.push(p);

    if (tool === 'eraser_stroke' || tool === 'eraser_pixel') {
      handleEraser(p);
    } else {
      // Direct 60 FPS animation frame request
      if (!rafId.current) {
        rafId.current = requestAnimationFrame(() => {
          renderCanvas();
          rafId.current = null;
        });
      }
    }
  };

  const handleEraser = (p: Point) => {
    const radius = tool === 'eraser_pixel' ? width * 2 : 24;
    setStrokes((prev) => {
      const remaining = prev.filter((s) => !strokeIntersectsCircle(s, p, radius));
      if (remaining.length !== prev.length) {
        soundFX.playEraseSound();
        soundFX.triggerHaptic(10);
        dispatchToWorker(remaining);
      }
      return remaining;
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    if (currentPoints.current.length > 0 && tool !== 'eraser_stroke' && tool !== 'eraser_pixel') {
      // 1. Check for Scratch-to-Erase gesture
      const scratch = detectScratchGesture(currentPoints.current);

      if (scratch.isScratch) {
        // Erase strokes intersecting the scratch bounds
        soundFX.playScratchGestureSound();
        soundFX.triggerHaptic(25);

        setStrokes((prev) => {
          const remaining = prev.filter((s) => !boxesIntersect(s.bounds, scratch.bounds, 12));
          dispatchToWorker(remaining);
          return remaining;
        });
      } else {
        // Normal stroke commit
        const newStroke: Stroke = {
          id: activeStrokeId.current || `stroke_${Date.now()}`,
          points: [...currentPoints.current],
          color,
          width,
          tool,
          timestamp: Date.now(),
          bounds: computeBoundingBox(currentPoints.current),
        };

        setStrokes((prev) => {
          const next = [...prev, newStroke];
          dispatchToWorker(next);
          return next;
        });
        setRedoStack([]);
      }
    }

    currentPoints.current = [];
    renderCanvas();
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none overflow-hidden paper-${paperStyle}`}
    >
      {/* 2D Canvas Layer */}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="absolute inset-0 cursor-crosshair touch-none select-none"
      />

      {/* Dynamic Inline Canvas Projection Layer */}
      <InlineProjection
        equations={equations}
        onOpenGraph={(eq) => setActivePlot(eq.plotData)}
      />

      {/* 2D Function Curve Graph Modal */}
      <GraphModal
        plotData={activePlot}
        onClose={() => setActivePlot(null)}
      />
    </div>
  );
};
