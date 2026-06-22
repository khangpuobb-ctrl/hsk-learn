import React, { useState, useEffect } from 'react';
import { X, Volume2, Search, HelpCircle } from 'lucide-react';
import { api } from '../lib/api';
import { SpeakButton } from './SpeakButton';

export function PopupDict({ word, x = 0, y = 0, onClose }) {
  const [loading, setLoading] = useState(false);
  const [vocabData, setVocabData] = useState(null);

  useEffect(() => {
    if (!word) return;

    const fetchWordDetails = async () => {
      setLoading(true);
      setVocabData(null);
      try {
        // Search in HSK database
        const cleanWord = word.replace(/[。，！？、]/g, '').trim();
        if (!cleanWord) {
          onClose();
          return;
        }

        const data = await api.get(`/api/vocabulary?search=${cleanWord}&limit=3`);
        
        // Find exact character match if possible, otherwise use first result
        const exactMatch = data.results.find(
          (v) => v.chinese === cleanWord || v.traditional === cleanWord
        );
        
        setVocabData(exactMatch || data.results[0] || null);
      } catch (err) {
        console.error('Popup dictionary search error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWordDetails();
  }, [word, onClose]);

  if (!word) return null;

  return (
    <div
      className="absolute z-50 w-72 bg-white dark:bg-slate-850 rounded-xl shadow-2xl border border-slate-105 dark:border-slate-800/80 p-4 transition-all duration-200 select-text"
      style={{
        left: `${Math.min(window.innerWidth - 300, Math.max(10, x - 144))}px`,
        top: `${y + 20}px`,
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-2 border-b border-slate-100 dark:border-slate-800/50 pb-1.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Từ điển mini</span>
        <button
          onClick={onClose}
          className="p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-650"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-gold border-t-transparent" />
          <span className="text-xs text-slate-450">Đang tra cứu...</span>
        </div>
      ) : vocabData ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <span className="chinese-char text-2xl font-bold text-navy dark:text-gold mr-2">
                {vocabData.chinese}
              </span>
              <span className="text-xs px-1.5 py-0.5 bg-gold/10 dark:bg-gold/5 text-gold-dark dark:text-gold rounded border border-gold/20 font-bold">
                HSK {vocabData.hsk_level}
              </span>
            </div>
            <SpeakButton text={vocabData.chinese} lang="zh-CN" className="w-8 h-8" />
          </div>

          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Pinyin: <span className="font-sans font-semibold text-slate-700 dark:text-slate-350">{vocabData.pinyin}</span>
          </div>

          {vocabData.part_of_speech && (
            <div className="text-xs text-slate-400 italic">
              Từ loại: {vocabData.part_of_speech}
            </div>
          )}

          <div className="border-t border-slate-100 dark:border-slate-800/50 pt-2 space-y-1.5">
            <div>
              <div className="text-xxs font-semibold text-slate-400 uppercase">Tiếng Việt</div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-205">
                {vocabData.vietnamese || 'Đang cập nhật'}
              </div>
            </div>
            <div>
              <div className="text-xxs font-semibold text-slate-400 uppercase">Tiếng Anh</div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-205">
                {vocabData.english}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <HelpCircle className="h-6 w-6 text-slate-300 dark:text-slate-600 mb-1" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Không tìm thấy từ "{word}" trong cơ sở dữ liệu HSK.
          </p>
        </div>
      )}
    </div>
  );
}
