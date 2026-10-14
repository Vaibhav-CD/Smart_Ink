/**
 * Smart_Ink Pasted Screenshot & OCR Solution Card
 * Performs 100% on-device OCR on pasted question screenshots and generates step-by-step solutions.
 */

import React, { useState, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { QuestionSolver, QuestionSolution } from '../engine/questionSolver';
import { X, Sparkles, Check, Copy, Edit3, Loader2 } from 'lucide-react';

export interface PastedImageItem {
  id: string;
  dataUrl: string;
  x: number;
  y: number;
  ocrText?: string;
  solution?: QuestionSolution;
  isLoading?: boolean;
}

interface ScreenshotCardProps {
  item: PastedImageItem;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updated: Partial<PastedImageItem>) => void;
}

export const ScreenshotCard: React.FC<ScreenshotCardProps> = ({
  item,
  onRemove,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(item.ocrText || '');
  const [copied, setCopied] = useState(false);

  // Run on-device OCR when image is pasted
  useEffect(() => {
    if (item.ocrText !== undefined || item.isLoading) return;

    let isMounted = true;
    onUpdate(item.id, { isLoading: true });

    async function performOcr() {
      try {
        const worker = await createWorker('eng');
        const ret = await worker.recognize(item.dataUrl);
        await worker.terminate();

        if (!isMounted) return;

        const rawText = ret.data.text.trim();
        // Clean up common OCR noise for math
        const cleaned = rawText
          .replace(/[—–]/g, '-')
          .replace(/[×]/g, '*')
          .replace(/[÷]/g, '/')
          .replace(/[\n\r]+/g, ' ')
          .trim();

        const sol = QuestionSolver.solve(cleaned);

        onUpdate(item.id, {
          ocrText: cleaned,
          solution: sol,
          isLoading: false,
        });
        setEditedText(cleaned);
      } catch (err) {
        console.error('OCR Error:', err);
        if (isMounted) {
          onUpdate(item.id, {
            ocrText: 'Could not automatically extract text. Click edit to enter question.',
            solution: undefined,
            isLoading: false,
          });
        }
      }
    }

    performOcr();

    return () => {
      isMounted = false;
    };
  }, [item.id, item.dataUrl, item.ocrText, item.isLoading, onUpdate]);

  const handleApplyEdit = () => {
    const sol = QuestionSolver.solve(editedText);
    onUpdate(item.id, {
      ocrText: editedText,
      solution: sol,
    });
    setIsEditing(false);
  };

  const handleCopySolution = () => {
    if (!item.solution?.result) return;
    const text = `${item.ocrText}\n\nSolution: ${item.solution.result}\n${item.solution.steps.join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{ left: `${item.x}px`, top: `${item.y}px` }}
      className="absolute z-20 w-[420px] max-w-[90vw] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-shadow hover:shadow-indigo-500/10"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
            Pasted Question Screenshot
          </span>
        </div>
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          title="Remove Screenshot Card"
        >
          <X size={16} />
        </button>
      </div>

      {/* Screenshot Preview */}
      <div className="p-3 bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center max-h-48 overflow-hidden border-b border-zinc-200 dark:border-zinc-800">
        <img
          src={item.dataUrl}
          alt="Pasted Math Question"
          className="max-h-40 max-w-full object-contain rounded-lg shadow-xs"
        />
      </div>

      {/* OCR Status & Solution Section */}
      <div className="p-4 space-y-3">
        {item.isLoading ? (
          <div className="flex items-center justify-center py-6 gap-3 text-indigo-600 dark:text-indigo-400 text-xs font-medium">
            <Loader2 size={18} className="animate-spin" />
            <span>Scanning screenshot with On-Device OCR...</span>
          </div>
        ) : (
          <>
            {/* Detected Question Text */}
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 mb-1">
                <span>Extracted Question</span>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center gap-1 text-indigo-600 hover:text-indigo-700"
                >
                  <Edit3 size={11} />
                  <span>{isEditing ? 'Cancel' : 'Edit text'}</span>
                </button>
              </div>

              {isEditing ? (
                <div className="space-y-2 mt-1">
                  <input
                    type="text"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-indigo-500"
                    placeholder="Enter or fix question text..."
                  />
                  <button
                    onClick={handleApplyEdit}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                  >
                    Solve Updated
                  </button>
                </div>
              ) : (
                <p className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200 break-words">
                  {item.ocrText || 'No text extracted'}
                </p>
              )}
            </div>

            {/* Computed Solution & Steps */}
            {item.solution && item.solution.isSuccess && (
              <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/60 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Calculated Solution
                  </span>
                  <button
                    onClick={handleCopySolution}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                  >
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="text-xl font-extrabold text-indigo-900 dark:text-indigo-200 font-mono">
                  {item.solution.result}
                </div>

                {item.solution.steps.length > 0 && (
                  <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-900/50 space-y-1">
                    <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                      Steps:
                    </span>
                    <ul className="text-xs text-zinc-700 dark:text-zinc-300 space-y-1 pl-3 list-disc">
                      {item.solution.steps.map((st, i) => (
                        <li key={i}>{st}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
