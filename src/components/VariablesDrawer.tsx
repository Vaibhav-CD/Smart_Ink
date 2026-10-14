/**
 * Smart_Ink Variable Memory Inspector Drawer
 * Shows live variable state and memory bindings across handwritten expressions.
 */

import React from 'react';
import { X, Trash2, Cpu } from 'lucide-react';

interface VariablesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  variables: Record<string, number>;
  onClearVariables: () => void;
}

export const VariablesDrawer: React.FC<VariablesDrawerProps> = ({
  isOpen,
  onClose,
  variables,
  onClearVariables,
}) => {
  if (!isOpen) return null;

  const entries = Object.entries(variables);

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-transform">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Cpu size={18} className="text-indigo-600 dark:text-indigo-400" />
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
            Variable Memory
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          <X size={18} />
        </button>
      </div>

      {/* Variable items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {entries.length === 0 ? (
          <div className="text-center py-10 px-4 text-zinc-400 dark:text-zinc-500 text-xs leading-relaxed">
            <p className="font-medium text-zinc-600 dark:text-zinc-400 mb-1">No Variables Defined Yet</p>
            <p>Write an assignment like <span className="font-mono text-indigo-500">x = 10</span> or <span className="font-mono text-indigo-500">r = 7</span> on the paper to store variables.</p>
          </div>
        ) : (
          entries.map(([name, value]) => (
            <div
              key={name}
              className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 font-mono text-sm"
            >
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{name}</span>
              <span className="text-zinc-400">=</span>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {typeof value === 'number' ? value.toLocaleString() : String(value)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {entries.length > 0 && (
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
          <button
            onClick={onClearVariables}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors border border-red-200 dark:border-red-900/40"
          >
            <Trash2 size={14} />
            Clear Variable Memory
          </button>
        </div>
      )}
    </div>
  );
};
