import React, { useState, useEffect } from 'react';
import { SpeakButton } from './SpeakButton';

export function FlipCard({ word, isFlipped, onFlip }) {
  // Front side of card
  const frontContent = (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="text-sm font-semibold tracking-widest text-slate-400 uppercase mb-4">
        Nhấn để lật mặt sau
      </div>
      <div className="chinese-char text-7xl font-bold text-navy dark:text-gold mb-6 select-none leading-none">
        {word.chinese}
      </div>
      <div className="text-xl font-medium text-slate-500 dark:text-slate-400 tracking-wide font-sans select-all">
        {word.pinyin}
      </div>
      <div className="mt-8 flex justify-center">
        <SpeakButton text={word.chinese} lang="zh-CN" className="w-12 h-12 shadow-sm" />
      </div>
    </div>
  );

  // Back side of card
  const backContent = (
    <div className="flex flex-col h-full p-6 select-text overflow-y-auto">
      {/* Title Header */}
      <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <div>
          <div className="chinese-char text-3xl font-bold text-navy dark:text-gold">
            {word.chinese}
          </div>
          <div className="text-sm text-slate-400 font-mono mt-0.5">{word.pinyin}</div>
        </div>
        <div className="flex items-center space-x-2">
          {word.part_of_speech && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-850 text-slate-500 dark:text-slate-450 uppercase border border-slate-200/50 dark:border-slate-800">
              {word.part_of_speech}
            </span>
          )}
          <SpeakButton text={word.chinese} lang="zh-CN" className="w-9 h-9" />
        </div>
      </div>

      {/* Translations */}
      <div className="space-y-3 mb-5 flex-1">
        <div>
          <div className="text-xs font-semibold text-slate-450 uppercase tracking-wider mb-1">
            Nghĩa tiếng Việt
          </div>
          <div className="text-base text-slate-800 dark:text-slate-100 font-medium">
            {word.vietnamese || 'Đang cập nhật'}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-450 uppercase tracking-wider mb-1">
            English Definition
          </div>
          <div className="text-base text-slate-800 dark:text-slate-100 font-medium">
            {word.english}
          </div>
        </div>
      </div>

      {/* Examples */}
      {word.example_zh && (
        <div className="bg-slate-50 dark:bg-navy-dark border border-slate-100 dark:border-slate-800/80 rounded-xl p-4 mt-auto">
          <div className="flex justify-between items-center mb-1.5">
            <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Ví dụ
            </div>
            <SpeakButton text={word.example_zh} lang="zh-CN" className="w-7 h-7" />
          </div>
          <div className="chinese-char text-lg font-semibold text-navy dark:text-slate-100 mb-1 leading-snug">
            {word.example_zh}
          </div>
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1 font-sans">
            {word.example_pinyin}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-350 italic">
            {word.example_en}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      onClick={() => onFlip(!isFlipped)}
      className="w-full max-w-md h-96 cursor-pointer perspective-1000 group mx-auto"
    >
      <div
        className={`relative w-full h-full duration-500 preserve-3d transition-transform ${
          isFlipped ? 'rotate-y-180' : ''
        }`}
      >
        {/* Front Face */}
        <div className="absolute inset-0 w-full h-full bg-white dark:bg-slate-850 rounded-2xl shadow-xl hover:shadow-2xl border border-slate-100 dark:border-slate-800/50 backface-hidden transition-all duration-300">
          {frontContent}
        </div>

        {/* Back Face */}
        <div className="absolute inset-0 w-full h-full bg-white dark:bg-slate-850 rounded-2xl shadow-xl hover:shadow-2xl border border-slate-100 dark:border-slate-800/50 backface-hidden rotate-y-180 transition-all duration-300">
          {backContent}
        </div>
      </div>
    </div>
  );
}
