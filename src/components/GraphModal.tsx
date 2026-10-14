/**
 * Smart_Ink Interactive 2D Function Curve Graph Modal
 * Renders Cartesian coordinate plane, axes, grid, and smooth mathematical function curve.
 */

import React, { useState } from 'react';
import { PlotData } from '../engine/plotter';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface GraphModalProps {
  plotData: PlotData | null;
  onClose: () => void;
}

export const GraphModal: React.FC<GraphModalProps> = ({ plotData, onClose }) => {
  const [zoom, setZoom] = useState(1);

  if (!plotData) return null;

  const width = 560;
  const height = 400;
  const padding = 40;

  const xMin = plotData.xMin / zoom;
  const xMax = plotData.xMax / zoom;
  const yMin = plotData.yMin / zoom;
  const yMax = plotData.yMax / zoom;

  // Coordinate transforms
  const toSvgX = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding);
  const toSvgY = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding);

  const originX = toSvgX(0);
  const originY = toSvgY(0);

  // Generate SVG polyline path
  const validPoints = plotData.points.filter(
    (p) => p.x >= xMin && p.x <= xMax && p.y >= yMin && p.y <= yMax
  );

  let pathD = '';
  if (validPoints.length > 0) {
    pathD = `M ${toSvgX(validPoints[0].x).toFixed(1)} ${toSvgY(validPoints[0].y).toFixed(1)}`;
    for (let i = 1; i < validPoints.length; i++) {
      pathD += ` L ${toSvgX(validPoints[i].x).toFixed(1)} ${toSvgY(validPoints[i].y).toFixed(1)}`;
    }
  }

  // Grid tick marks
  const xTicks = [-10, -5, -2, 2, 5, 10].filter((t) => t >= xMin && t <= xMax);
  const yTicks = [-10, -5, -2, 2, 5, 10].filter((t) => t >= yMin && t <= yMax);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Interactive 2D Curve Plot
            </span>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {plotData.title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.min(z * 1.3, 5))}
              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z / 1.3, 0.3))}
              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-zinc-500 hover:text-red-600 transition-colors ml-2"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Graph SVG canvas */}
        <div className="p-4 flex items-center justify-center bg-zinc-950">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto max-h-[380px] select-none"
          >
            {/* Background grid */}
            <defs>
              <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#27273a" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width={width} height={height} fill="url(#grid)" />

            {/* X and Y Axes */}
            {originX >= padding && originX <= width - padding && (
              <line
                x1={originX}
                y1={padding}
                x2={originX}
                y2={height - padding}
                stroke="#6366f1"
                strokeWidth="1.5"
                opacity="0.8"
              />
            )}
            {originY >= padding && originY <= height - padding && (
              <line
                x1={padding}
                y1={originY}
                x2={width - padding}
                y2={originY}
                stroke="#6366f1"
                strokeWidth="1.5"
                opacity="0.8"
              />
            )}

            {/* X Tick labels */}
            {xTicks.map((tick) => {
              const sx = toSvgX(tick);
              if (sx < padding || sx > width - padding) return null;
              return (
                <g key={`xtick_${tick}`}>
                  <line x1={sx} y1={originY - 3} x2={sx} y2={originY + 3} stroke="#a5b4fc" strokeWidth="1" />
                  <text
                    x={sx}
                    y={originY + 14}
                    fontSize="10"
                    fill="#94a3b8"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Y Tick labels */}
            {yTicks.map((tick) => {
              const sy = toSvgY(tick);
              if (sy < padding || sy > height - padding) return null;
              return (
                <g key={`ytick_${tick}`}>
                  <line x1={originX - 3} y1={sy} x2={originX + 3} y2={sy} stroke="#a5b4fc" strokeWidth="1" />
                  <text
                    x={originX - 8}
                    y={sy + 3}
                    fontSize="10"
                    fill="#94a3b8"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {tick}
                  </text>
                </g>
              );
            })}

            {/* Function Curve */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
          <span>Domain: [{xMin.toFixed(1)}, {xMax.toFixed(1)}]</span>
          <span className="font-mono text-indigo-500 font-medium">100% Client-Side Rendered</span>
        </div>
      </div>
    </div>
  );
};
