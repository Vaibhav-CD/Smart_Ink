/**
 * Smart_Ink Dynamic Canvas Projection Layer
 * Projects calculated answers directly onto the canvas adjacent to the terminal '=' sign.
 * Features smooth micro-interactions, copy-to-clipboard, convert-to-ink, and curve graphing.
 */

import React, { useState } from 'react';
import { RecognizedEquation } from '../canvas/types';
import { Copy, Check, LineChart, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InlineProjectionProps {
  equations: RecognizedEquation[];
  onOpenGraph: (eq: RecognizedEquation) => void;
  onConvertToInk?: (eq: RecognizedEquation) => void;
}

export const InlineProjection: React.FC<InlineProjectionProps> = ({
  equations,
  onOpenGraph,
  onConvertToInk,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (eq: RecognizedEquation) => {
    if (!eq.evalResult.displayText) return;
    navigator.clipboard.writeText(eq.evalResult.displayText);
    setCopiedId(eq.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleTriggerConfetti = (e: React.MouseEvent) => {
    e.stopPropagation();
    confetti({
      particleCount: 45,
      spread: 60,
      origin: { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight },
      colors: ['#6366f1', '#ec4899', '#3b82f6', '#10b981'],
    });
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {equations.map((eq) => {
        const isUndefined = eq.evalResult.status === 'undefined';
        const isError = eq.evalResult.status === 'error';
        const displayText = isUndefined
          ? 'Undefined'
          : isError
          ? '...'
          : eq.evalResult.displayText;

        if (!displayText) return null;

        const anchorX = eq.projectionAnchor.x;
        const anchorY = eq.projectionAnchor.y;

        return (
          <div
            key={eq.id}
            style={{
              left: `${anchorX}px`,
              top: `${anchorY}px`,
              transform: 'translateY(-50%)',
            }}
            className="absolute pointer-events-auto flex items-center gap-2 group transition-all duration-300 ease-out select-none"
          >
            {/* Answer Display */}
            <div
              className={`flex items-baseline gap-1.5 px-3 py-1 rounded-xl shadow-lg border backdrop-blur-md transition-all transform hover:scale-105 ${
                isUndefined
                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-700 dark:text-amber-300'
                  : isError
                  ? 'bg-zinc-500/10 border-zinc-400/30 text-zinc-500'
                  : 'bg-indigo-50/90 dark:bg-zinc-800/90 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {!displayText.includes('=') && (
                <span className="text-xl font-bold opacity-75 select-none">=</span>
              )}
              <span
                className="text-3xl font-extrabold tracking-tight handwriting-font select-all"
                style={{ fontFamily: "'Caveat', 'Patrick Hand', cursive" }}
              >
                {displayText}
              </span>


              {!isUndefined && !isError && (
                <button
                  onClick={handleTriggerConfetti}
                  className="opacity-0 group-hover:opacity-100 p-1 text-indigo-500 hover:text-indigo-600 transition-opacity"
                  title="Celebrate!"
                >
                  <Sparkles size={14} />
                </button>
              )}
            </div>

            {/* Micro-interaction Action Controls on Hover */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 bg-white/90 dark:bg-zinc-800/90 p-1 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 transition-opacity duration-200">
              <button
                onClick={() => handleCopy(eq)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                title="Copy Answer"
              >
                {copiedId === eq.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>

              {eq.isPlottable && (
                <button
                  onClick={() => onOpenGraph(eq)}
                  className="p-1 rounded text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors"
                  title="Plot 2D Graph"
                >
                  <LineChart size={14} />
                </button>
              )}
            </div>

            {/* Expression Tooltip on hover */}
            <div className="absolute top-full left-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
              <div className="px-2.5 py-1 bg-zinc-900 text-zinc-200 text-xs rounded-md shadow-md whitespace-nowrap flex items-center gap-2">
                <span className="font-mono">{eq.rawExpression}</span>
                <span className="text-zinc-500">|</span>
                <span className="text-emerald-400 font-semibold">
                  {Math.round(eq.confidence * 100)}% match
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
