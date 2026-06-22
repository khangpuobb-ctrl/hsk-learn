import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

export function SpeakButton({ text, lang = 'zh-CN', className = '' }) {
  const { speak, isSpeaking } = useSpeech();

  const handleSpeak = (e) => {
    e.stopPropagation(); // Avoid triggering parent actions (like flipping a card)
    speak(text, lang);
  };

  return (
    <button
      id={`speak-btn-${text.substring(0, 5).replace(/\s+/g, '-')}`}
      onClick={handleSpeak}
      type="button"
      className={`p-2 rounded-full transition-all duration-300 ${
        isSpeaking
          ? 'bg-gold text-navy-dark scale-110 shadow-md ring-4 ring-gold/20 animate-pulse'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 hover:scale-105'
      } ${className}`}
      title={lang === 'zh-CN' ? 'Phát âm tiếng Trung' : 'Read in English'}
    >
      {isSpeaking ? (
        <Volume2 className="h-5 w-5" />
      ) : (
        <Volume2 className="h-5 w-5" />
      )}
    </button>
  );
}
