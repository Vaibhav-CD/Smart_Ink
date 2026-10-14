/**
 * Smart_Ink Quick Start & Gesture Hints Card
 */

import React, { useState } from 'react';
import { HelpCircle, X, Sparkles, Zap, Layers, RefreshCw } from 'lucide-react';

export const QuickStartGuide: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating help toggle badge in bottom-right */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-30 flex items-center gap-1.5 px-3 py-2 bg-white/90 dark:bg-zinc-800/90 hover:bg-white dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold backdrop-blur-md transition-all"
        title="Tips & Gesture Guide"
      >
        <HelpCircle size={15} className="text-indigo-600 dark:text-indigo-400" />
        <span>Tips & Gestures</span>
      </button>

      {/* Guide Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  How to Use Smart_Ink
                </h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Handwritten Equations</h4>
                  <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                    Write any arithmetic expression ending with an equals sign (e.g. <span className="font-mono text-indigo-600">18 + 4 * 3 =</span>). The answer is calculated and projected right next to the <span className="font-mono">=</span> sign!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
                  <Zap size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Scratch-to-Erase Gesture</h4>
                  <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                    Quickly scribble back-and-forth across any digit or symbol to erase it instantly, just like real pencil on paper!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Layers size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Variable Memory & Formulas</h4>
                  <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                    Define variables like <span className="font-mono text-indigo-600">x = 10</span>. In subsequent lines, write <span className="font-mono text-indigo-600">x * 5 =</span> to compute using stored variables!
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                  <RefreshCw size={16} />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Interactive 2D Function Graphs</h4>
                  <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                    Write functions like <span className="font-mono text-indigo-600">y = x ^ 2</span>. Hover over the answer badge and click the graph icon to launch an interactive Cartesian curve plotter!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs transition-colors"
            >
              Got it, start sketching!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
