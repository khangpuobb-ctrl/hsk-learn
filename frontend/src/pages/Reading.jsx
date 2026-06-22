import React, { useState, useEffect } from 'react';
import { BookOpen, Layers, MessageSquare, ArrowLeft, Play, Square, Volume2 } from 'lucide-react';
import { api } from '../lib/api';
import { useSpeech } from '../hooks/useSpeech';
import { PopupDict } from '../components/PopupDict';

export function Reading() {
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState(1);
  const [category, setCategory] = useState('');
  
  // Interactive Popup Dict States
  const [popupWord, setPopupWord] = useState('');
  const [popupPos, setPopupPos] = useState({ x: 0, y: 0 });

  // TTS speech
  const { speak, stop, isSpeaking } = useSpeech();

  // Fetch list of lessons
  useEffect(() => {
    if (selectedLesson) return; // Don't fetch list if viewing details
    
    const fetchLessons = async () => {
      setLoading(true);
      try {
        let url = `/api/lessons?level=${level}`;
        if (category) url += `&category=${category}`;
        const data = await api.get(url);
        setLessons(data.results || []);
      } catch (err) {
        console.error('Failed to load lessons:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [level, category, selectedLesson]);

  // Fetch single lesson detail
  const handleSelectLesson = async (id) => {
    setLoading(true);
    setPopupWord('');
    try {
      const data = await api.get(`/api/lessons/${id}`);
      setSelectedLesson(data.lesson);
    } catch (err) {
      console.error('Failed to load lesson detail:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCharClick = (char, e) => {
    e.stopPropagation();
    setPopupWord(char);
    setPopupPos({ x: e.clientX, y: e.clientY });
  };

  // Close popup dictionary if user clicks anywhere else
  useEffect(() => {
    const handleGlobalClick = () => setPopupWord('');
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  // Speak whole lesson text
  const speakWholeLesson = () => {
    if (isSpeaking) {
      stop();
      return;
    }
    if (!selectedLesson) return;
    
    // Join all sentences in Chinese
    const sentences = selectedLesson.content_zh;
    const fullText = sentences.join(' ');
    speak(fullText, 'zh-CN');
  };

  // Render individual Chinese character buttons
  const renderInteractiveSentence = (sentence) => {
    const chars = Array.from(sentence);
    return chars.map((char, index) => {
      const isPunctuation = /[。，！？、,.!?]/g.test(char);
      if (isPunctuation) {
        return <span key={index} className="text-slate-400 dark:text-slate-655 font-serif text-2xl">{char}</span>;
      }
      return (
        <span
          key={index}
          onClick={(e) => handleCharClick(char, e)}
          className="inline-block hover:text-gold dark:hover:text-gold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-0.5 transition-all font-serif font-semibold text-2xl select-none text-navy dark:text-slate-100"
        >
          {char}
        </span>
      );
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 relative">
      {/* Mini Dictionary Popup overlay */}
      {popupWord && (
        <PopupDict
          word={popupWord}
          x={popupPos.x}
          y={popupPos.y}
          onClose={() => setPopupWord('')}
        />
      )}

      {selectedLesson ? (
        /* =================== LESSON VIEW VIEW =================== */
        <div className="space-y-6">
          {/* Back Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm gap-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  stop();
                  setSelectedLesson(null);
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all text-slate-600 dark:text-slate-300"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-navy dark:text-slate-100">
                  {selectedLesson.title_zh}
                </h1>
                <p className="text-xs text-slate-400">{selectedLesson.title_en}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gold/10 text-gold-dark dark:text-gold border border-gold/20">
                HSK {selectedLesson.hsk_level}
              </span>
              <button
                onClick={speakWholeLesson}
                className={`inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer ${
                  isSpeaking
                    ? 'bg-red-600 hover:bg-red-700 text-white animate-pulse'
                    : 'bg-navy hover:bg-navy-light text-white'
                }`}
              >
                {isSpeaking ? (
                  <>
                    <Square className="h-3.5 w-3.5" />
                    <span>Dừng đọc bài</span>
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    <span>Đọc toàn bộ bài</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Guidelines */}
          <div className="bg-amber-500/5 border border-gold/20 rounded-xl p-3.5 text-xs text-slate-500 dark:text-slate-400 flex items-start space-x-2">
            <span>💡</span>
            <p><strong>Mẹo học tập:</strong> Di chuột hoặc nhấp chuột vào bất kỳ chữ Hán nào để xem phiên âm Pinyin, nghĩa tiếng Anh và tiếng Việt trực tiếp trong từ điển mini!</p>
          </div>

          {/* Main Reading Canvas */}
          <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-md space-y-8 max-w-4xl mx-auto">
            {selectedLesson.content_zh.map((zhSentence, index) => {
              const pinyinSentence = selectedLesson.content_pinyin[index] || '';
              const enSentence = selectedLesson.content_en[index] || '';
              const viSentence = selectedLesson.content_vi ? selectedLesson.content_vi[index] : '';

              return (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/40 last:border-b-0"
                >
                  {/* Chinese Character + Pinyin Column */}
                  <div className="space-y-2">
                    <div className="flex items-start space-x-2.5">
                      {/* Audio Synthesizer */}
                      <button
                        onClick={() => speak(zhSentence, 'zh-CN')}
                        className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-400 hover:text-navy dark:hover:text-gold transition-colors mt-1"
                        title="Nghe câu này"
                      >
                        <Volume2 className="h-4.5 w-4.5" />
                      </button>
                      <div className="space-y-1.5 leading-relaxed">
                        <div className="flex flex-wrap items-center">
                          {renderInteractiveSentence(zhSentence)}
                        </div>
                        <div className="text-sm font-medium font-sans text-slate-400 dark:text-slate-500 tracking-wide select-all">
                          {pinyinSentence}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Translations Column */}
                  <div className="md:border-l md:border-slate-100 md:dark:border-slate-800/40 md:pl-6 space-y-2 flex flex-col justify-center">
                    {viSentence && (
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {viSentence}
                      </p>
                    )}
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                      {enSentence}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* =================== LESSON LIST VIEW =================== */
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-sm gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                <BookOpen className="h-5.5 w-5.5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-navy dark:text-slate-100">Bài đọc song ngữ</h1>
                <p className="text-xs text-slate-400">Rèn luyện kỹ năng đọc hiểu và mở rộng vốn từ</p>
              </div>
            </div>

            {/* Level Selector */}
            <div className="flex space-x-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              {[1, 2, 3, 4, 5, 6].map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
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

          {/* Category Tabs */}
          <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 pb-px">
            {[
              { id: '', label: 'Tất cả chủ đề' },
              { id: 'daily', label: 'Giao tiếp hàng ngày' },
              { id: 'travel', label: 'Du lịch & Khám phá' },
              { id: 'business', label: 'Công việc' },
              { id: 'culture', label: 'Văn hóa' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategory(tab.id)}
                className={`pb-3 px-3 text-sm font-semibold transition-all border-b-2 ${
                  category === tab.id
                    ? 'border-gold text-gold-dark dark:text-gold'
                    : 'border-transparent text-slate-405 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Lessons Grid list */}
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[30vh] space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-gold border-t-transparent" />
              <span className="text-xs text-slate-450">Đang chuẩn bị danh sách bài đọc...</span>
            </div>
          ) : lessons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson.id)}
                  className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-gold/20 cursor-pointer transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xxs font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        {lesson.category || 'Hàng ngày'}
                      </span>
                      <span className="text-xs text-slate-400">HSK {lesson.hsk_level}</span>
                    </div>
                    <h3 className="chinese-char text-xl font-bold text-navy dark:text-slate-100">
                      {lesson.title_zh}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                      {lesson.title_en}
                    </p>
                  </div>

                  <div className="flex justify-end pt-4 mt-4 border-t border-slate-50 dark:border-slate-800/40">
                    <span className="text-xs font-semibold text-gold-dark dark:text-gold flex items-center hover:underline">
                      Đọc chi tiết →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800/80 p-12 text-center text-slate-500 max-w-md mx-auto">
              Chưa có bài đọc nào được đăng tải cho cấp độ và danh mục này.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
