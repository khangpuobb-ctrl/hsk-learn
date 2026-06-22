import React from 'react';

export function ProgressBar({ value = 0, max = 100, label = '', showPercent = true, className = '' }) {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100))) || 0;

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5 text-sm font-medium text-slate-600 dark:text-slate-400">
          <span>{label}</span>
          {showPercent && <span className="font-mono text-navy dark:text-gold">{percentage}%</span>}
        </div>
      )}
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-gold h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
