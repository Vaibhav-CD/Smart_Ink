/**
 * Smart_Ink Floating Glassmorphism Utility Toolbar
 * Hosts tool selection, color palette, stroke width, paper textures,
 * undo/redo stack, sound toggles, and variable memory inspector.
 */

import React, { useState } from 'react';
import { InkTool, PaperStyle } from '../canvas/types';
import {
  Pen,
  Highlighter,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Volume2,
  VolumeX,
  FileText,
  Cpu,
  Sparkles,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { SAMPLE_PRESETS, SamplePreset } from '../canvas/sampleEquations';

interface ToolbarProps {
  tool: InkTool;
  setTool: (t: InkTool) => void;
  color: string;
  setColor: (c: string) => void;
  width: number;
  setWidth: (w: number) => void;
  paperStyle: PaperStyle;
  setPaperStyle: (s: PaperStyle) => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean | ((prev: boolean) => boolean)) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  variablesCount: number;
  onOpenVariables: () => void;
  onInsertSample: (preset: SamplePreset) => void;
}

const INK_COLORS = [
  { name: 'Ink Black', value: '#18181b' },
  { name: 'Navy Blue', value: '#1e3a8a' },
  { name: 'Crimson Red', value: '#dc2626' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Violet', value: '#7c3aed' },
  { name: 'Amber Gold', value: '#d97706' },
];

const STROKE_WIDTHS = [
  { label: 'Fine', value: 2.5 },
  { label: 'Medium', value: 4.5 },
  { label: 'Broad', value: 8 },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  color,
  setColor,
  width,
  setWidth,
  paperStyle,
  setPaperStyle,
  soundEnabled,
  setSoundEnabled,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo,
  variablesCount,
  onOpenVariables,
  onInsertSample,
}) => {
  const [showSamples, setShowSamples] = useState(false);
  const [showPaperMenu, setShowPaperMenu] = useState(false);

  return (
    <header className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-2 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-xl border border-zinc-200/80 dark:border-zinc-800/80 rounded-2xl shadow-xl select-none max-w-[95vw] overflow-x-auto">
      {/* Brand & On-Device Badge */}
      <div className="flex items-center gap-2 px-2.5 py-1 border-r border-zinc-200 dark:border-zinc-800">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-indigo-500/20">
          SI
        </div>
        <div className="hidden sm:flex flex-col">
          <span className="font-bold text-xs tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
            Smart_Ink
            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
              <ShieldCheck size={10} className="mr-0.5" /> 100% On-Device
            </span>
          </span>
          <span className="text-[10px] text-zinc-400">Edge Math Notebook</span>
        </div>
      </div>

      {/* Tools Segment */}
      <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-xl">
        <button
          onClick={() => setTool('pen')}
          className={`p-2 rounded-lg transition-all ${
            tool === 'pen'
              ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
          title="Pen"
        >
          <Pen size={18} />
        </button>

        <button
          onClick={() => setTool('highlighter')}
          className={`p-2 rounded-lg transition-all ${
            tool === 'highlighter'
              ? 'bg-white dark:bg-zinc-700 text-amber-500 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
          title="Highlighter"
        >
          <Highlighter size={18} />
        </button>

        <button
          onClick={() => setTool('eraser_stroke')}
          className={`p-2 rounded-lg transition-all ${
            tool === 'eraser_stroke'
              ? 'bg-white dark:bg-zinc-700 text-rose-500 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
          }`}
          title="Stroke Eraser (Erases full stroke)"
        >
          <Eraser size={18} />
        </button>
      </div>

      {/* Color Palette (only active for pen/highlighter) */}
      {tool !== 'eraser_stroke' && tool !== 'eraser_pixel' && (
        <div className="flex items-center gap-1.5 px-2 py-1 border-r border-zinc-200 dark:border-zinc-800">
          {INK_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-5 h-5 rounded-full transition-transform ${
                color === c.value
                  ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500 shadow-sm'
                  : 'hover:scale-110 opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
      )}

      {/* Stroke Width Selector */}
      {tool !== 'eraser_stroke' && (
        <div className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/70 p-1 rounded-xl text-xs">
          {STROKE_WIDTHS.map((sw) => (
            <button
              key={sw.label}
              onClick={() => setWidth(sw.value)}
              className={`px-2 py-1 rounded-lg transition-all font-medium ${
                width === sw.value
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {sw.label}
            </button>
          ))}
        </div>
      )}

      {/* Undo / Redo */}
      <div className="flex items-center gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>
      </div>

      {/* Paper Style Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowPaperMenu(!showPaperMenu)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Change Paper Style"
        >
          <FileText size={16} />
          <span className="capitalize hidden lg:inline">{paperStyle.replace('-', ' ')}</span>
          <ChevronDown size={12} />
        </button>

        {showPaperMenu && (
          <div className="absolute top-full mt-2 left-0 w-36 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-1.5 z-50">
            {(['ruled', 'grid', 'dot', 'blank', 'dark-grid', 'dark-blank'] as PaperStyle[]).map((style) => (
              <button
                key={style}
                onClick={() => {
                  setPaperStyle(style);
                  setShowPaperMenu(false);
                }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                  paperStyle === style
                    ? 'bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {style.replace('-', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sound FX Toggle */}
      <button
        onClick={() => setSoundEnabled((prev) => !prev)}
        className={`p-2 rounded-lg transition-colors ${
          soundEnabled
            ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-zinc-800'
            : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
        }`}
        title={soundEnabled ? 'Mute Audio Micro-interactions' : 'Enable Audio Micro-interactions'}
      >
        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>

      {/* Variables Drawer Trigger */}
      <button
        onClick={onOpenVariables}
        className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
        title="Open Variable Memory"
      >
        <Cpu size={15} />
        <span className="hidden sm:inline">Vars</span>
        {variablesCount > 0 && (
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
            {variablesCount}
          </span>
        )}
      </button>

      {/* Sample Equations Preset Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowSamples(!showSamples)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 shadow-sm transition-all"
        >
          <Sparkles size={14} />
          <span>Samples</span>
          <ChevronDown size={12} />
        </button>

        {showSamples && (
          <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-2 z-50">
            <div className="text-[11px] font-semibold text-zinc-400 px-2 py-1 uppercase tracking-wider">
              Try Sample Equations
            </div>
            {SAMPLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  onInsertSample(preset);
                  setShowSamples(false);
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group"
              >
                <div className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600">
                  {preset.name}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear Canvas */}
      <button
        onClick={onClear}
        className="p-2 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        title="Clear Canvas"
      >
        <Trash2 size={18} />
      </button>
    </header>
  );
};
