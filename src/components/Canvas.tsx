/**
 * Smart_Ink Interactive Digital Ink Canvas
 * Ultra low-latency Dual-Canvas Architecture (Locked at 60–120 FPS):
 * - Committed Canvas: Caches all completed strokes (zero redraw per pointermove frame)
 * - Active Canvas: High-frequency transparent overlay for single active stroke
 * - Paste Screenshot OCR & Solution Card support
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
import { ScreenshotCard, PastedImageItem } from './ScreenshotCard';
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
  uploadedImageTrigger?: { id: number; dataUrl: string };
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
  uploadedImageTrigger,

}) => {
  // Dual-Canvas Architecture
  const committedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const activeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Stroke state & Undo/Redo stacks
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  // Recognized equations & Web Worker
  const [equations, setEquations] = useState<RecognizedEquation[]>([]);
  const [activePlot, setActivePlot] = useState<PlotData | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Pasted Screenshot Cards
  const [pastedImages, setPastedImages] = useState<PastedImageItem[]>([]);

  // Drawing tracking
  const isDrawing = useRef(false);
  const currentPoints = useRef<Point[]>([]);
  const activeStrokeId = useRef<string | null>(null);

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
        if (
          newEquations.length > 0 &&
          newEquations.some((eq: RecognizedEquation) => eq.evalResult.status === 'success')
        ) {
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

  // Redraw ONLY the committed canvas when strokes state changes
  const redrawCommittedCanvas = useCallback(() => {
    const canvas = committedCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    for (const stroke of strokes) {
      drawStrokeOnContext(ctx, stroke);
    }
    ctx.restore();
  }, [strokes]);

  useEffect(() => {
    redrawCommittedCanvas();
  }, [redrawCommittedCanvas]);

  // Clear active overlay canvas
  const clearActiveCanvas = useCallback(() => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }, []);

  // Handle Canvas High-DPI Scaling & Resizing
  const resizeCanvases = useCallback(() => {
    const committed = committedCanvasRef.current;
    const active = activeCanvasRef.current;
    const container = containerRef.current;
    if (!committed || !active || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();

    [committed, active].forEach((canvas) => {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    });

    redrawCommittedCanvas();
  }, [redrawCommittedCanvas]);

  useEffect(() => {
    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
    return () => window.removeEventListener('resize', resizeCanvases);
  }, [resizeCanvases]);

  // Undo / Redo / Clear triggers
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
      setPastedImages([]);
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

  // Uploaded Image trigger
  useEffect(() => {
    if (uploadedImageTrigger && uploadedImageTrigger.dataUrl) {
      const startX = Math.max(60, window.innerWidth * 0.25);
      const startY = Math.max(120, window.innerHeight * 0.2);

      const newItem: PastedImageItem = {
        id: `img_${uploadedImageTrigger.id}`,
        dataUrl: uploadedImageTrigger.dataUrl,
        x: startX,
        y: startY,
      };

      setPastedImages((prev) => [...prev, newItem]);
      soundFX.playSolveChime();
    }
  }, [uploadedImageTrigger]);


  // Screenshot Paste Handler (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              const startX = Math.max(60, window.innerWidth * 0.25);
              const startY = Math.max(120, window.innerHeight * 0.2);

              const newItem: PastedImageItem = {
                id: `img_${Date.now()}`,
                dataUrl,
                x: startX,
                y: startY,
              };

              setPastedImages((prev) => [...prev, newItem]);
              soundFX.playSolveChime();
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Pointer Event Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = activeCanvasRef.current;
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
    } else {
      // Draw first point on active canvas
      renderActiveStroke();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = activeCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();

    // Use coalesced events if available for high-frequency precision
    const events = (e.nativeEvent as any).getCoalescedEvents
      ? (e.nativeEvent as any).getCoalescedEvents()
      : [e];

    for (const ev of events) {
      const p: Point = {
        x: ev.clientX - rect.left,
        y: ev.clientY - rect.top,
        pressure: ev.pressure > 0 ? ev.pressure : 0.5,
        time: Date.now(),
      };
      currentPoints.current.push(p);

      if (tool === 'eraser_stroke' || tool === 'eraser_pixel') {
        handleEraser(p);
      }
    }

    if (tool !== 'eraser_stroke' && tool !== 'eraser_pixel') {
      renderActiveStroke();
    }
  };

  // Ultra-fast render of ONLY the current stroke (takes <0.1ms)
  const renderActiveStroke = () => {
    const canvas = activeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    if (currentPoints.current.length > 0) {
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

    const canvas = activeCanvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    // Clear the active overlay canvas
    clearActiveCanvas();

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
        // Commit stroke to background canvas
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
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none overflow-hidden paper-${paperStyle}`}
    >
      {/* 1. Committed Background Canvas (Zero redraw during pointer movement) */}
      <canvas
        ref={committedCanvasRef}
        className="absolute inset-0 pointer-events-none select-none"
      />

      {/* 2. Active Foreground Canvas (Captures pointer events & renders active stroke) */}
      <canvas
        ref={activeCanvasRef}
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

      {/* Pasted Question Screenshot Cards */}
      {pastedImages.map((img) => (
        <ScreenshotCard
          key={img.id}
          item={img}
          onRemove={(id) => setPastedImages((prev) => prev.filter((p) => p.id !== id))}
          onUpdate={(id, updated) =>
            setPastedImages((prev) =>
              prev.map((p) => (p.id === id ? { ...p, ...updated } : p))
            )
          }
        />
      ))}

      {/* 2D Function Curve Graph Modal */}
      <GraphModal
        plotData={activePlot}
        onClose={() => setActivePlot(null)}
      />
    </div>
  );
};
