import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Layers, RotateCcw, AlertTriangle, ArrowRight, Check, Award, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useProgress } from '../hooks/useProgress';
import { FlipCard } from '../components/FlipCard';

export function Flashcard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const level = parseInt(searchParams.get('level') || '1');
  const navigate = useNavigate();

  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deckCompleted, setDeckCompleted] = useState(false);

  const { updateSrs } = useProgress();

  const fetchDeck = async () => {
    setLoading(true);
    setError('');
    setDeckCompleted(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    try {
      const data = await api.get(`/api/vocabulary/random?level=${level}&count=10&exclude_mastered=true`);
      setWords(data.results || []);
      if (data.results.length === 0) {
        setError('Bạn đã nhuần nhuyễn tất cả từ vựng ở cấp độ này! Hãy chọn cấp độ khác hoặc học lại.');
      }
    } catch (err) {
      setError('Không thể tải từ vựng. Vui lòng đăng nhập và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeck();
  }, [level]);

  const handleSrsSelection = async (quality) => {
    const word = words[currentIndex];
    setIsFlipped(false);

    // Update progress in database (SM-2)
    try {
      await updateSrs(word.id, quality);
    } catch (e) {
      console.error('Failed to report SRS update:', e);
    }

    // Go to next card after a brief delay so card flips back
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setDeckCompleted(true);
      }
    }, 200);
  };

  const handleLevelChange = (newLevel) => {
    setSearchParams({ level: newLevel.toString() });
  };

  const currentWord = words[currentIndex];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gold/15 text-gold-dark dark:text-gold rounded-xl">
            <Layers className="h-5.5 w-5.5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-navy dark:text-slate-100">Học qua Flashcard</h1>
            <p className="text-xs text-slate-400">Chọn cấp độ HSK và đánh giá độ nhớ để kích hoạt SRS</p>
          </div>
        </div>

        {/* Level Filters */}
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
          {[1, 2, 3, 4, 5, 6].map((l) => (
            <button
              key={l}
              onClick={() => handleLevelChange(l)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                level === l
                  ? 'bg-navy dark:bg-gold text-white dark:text-navy-dark shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              HSK {l}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-gold border-t-transparent" />
          <span className="text-sm text-slate-500">Đang sắp xếp bộ thẻ từ vựng...</span>
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-slate-850 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/80 shadow-md text-center max-w-md mx-auto space-y-4">
          <AlertTriangle className="h-12 w-12 text-gold mx-auto" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Thông báo</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
          <button
            onClick={fetchDeck}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-navy hover:bg-navy-light text-white text-sm font-semibold rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Tải lại dữ liệu</span>
          </button>
        </div>
      ) : deckCompleted ? (
        /* Deck Completed Screen */
        <div className="bg-white dark:bg-slate-855 rounded-3xl p-8 border border-slate-100 dark:border-slate-800/80 shadow-xl text-center max-w-md mx-auto space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-gold/15 text-gold-dark dark:text-gold rounded-full flex items-center justify-center mx-auto">
            <Award className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-extrabold text-navy dark:text-gold">Hoàn thành bộ thẻ!</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Tuyệt vời! Bạn đã hoàn thành việc ôn tập bộ 10 thẻ từ vựng HSK {level}. Hãy tiếp tục duy trì streak học tập nhé!
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={fetchDeck}
              className="flex-1 py-2.5 px-4 bg-gold hover:bg-gold-dark text-navy-dark font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              Học tiếp bộ mới
            </button>
            <button
              onClick={() => navigate('/quiz?level=' + level)}
              className="flex-1 py-2.5 px-4 bg-navy hover:bg-navy-light text-white font-bold text-sm rounded-xl shadow-md transition-all cursor-pointer border border-navy-light"
            >
              Làm quiz kiểm tra
            </button>
          </div>
        </div>
      ) : currentWord ? (
        /* Flashcard Deck Session */
        <div className="space-y-6">
          {/* Card counter */}
          <div className="flex justify-between items-center max-w-md mx-auto">
            <span className="text-sm font-semibold text-slate-450">Thẻ từ vựng</span>
            <span className="text-sm font-mono font-bold text-navy dark:text-gold">
              {currentIndex + 1} / {words.length}
            </span>
          </div>

          {/* 3D Flip Card */}
          <FlipCard word={currentWord} isFlipped={isFlipped} onFlip={setIsFlipped} />

          {/* Feedback Buttons */}
          <div className="max-w-md mx-auto bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col items-center space-y-4">
            {!isFlipped ? (
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center py-2 animate-bounce">
                💡 Hãy suy nghĩ nghĩa và nhấp vào thẻ để xem đáp án
              </div>
            ) : (
              <div className="w-full space-y-3">
                <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest text-center">
                  Bạn có nhớ từ này không?
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSrsSelection(1)}
                    className="flex-1 flex flex-col items-center py-2 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-955/30 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="text-base font-bold">Không nhớ</span>
                    <span className="text-xxs opacity-70">Ôn lại sớm</span>
                  </button>
                  <button
                    onClick={() => handleSrsSelection(3)}
                    className="flex-1 flex flex-col items-center py-2 px-3 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:hover:bg-amber-955/30 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-300 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="text-base font-bold">Khó nhớ</span>
                    <span className="text-xxs opacity-70">Ôn trung hạn</span>
                  </button>
                  <button
                    onClick={() => handleSrsSelection(5)}
                    className="flex-1 flex flex-col items-center py-2 px-3 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:hover:bg-emerald-955/30 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-xl transition-all cursor-pointer"
                  >
                    <span className="text-base font-bold">Dễ nhớ</span>
                    <span className="text-xxs opacity-70">Ôn dài hạn</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center text-slate-500 py-12">Không có từ vựng phù hợp.</div>
      )}
    </div>
  );
}
