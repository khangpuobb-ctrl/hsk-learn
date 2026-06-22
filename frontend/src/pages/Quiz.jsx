import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckSquare, Volume2, Award, AlertCircle, Play, Check, X, ArrowRight, RefreshCw, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { useSpeech } from '../hooks/useSpeech';

export function Quiz() {
  const [searchParams] = useSearchParams();
  const defaultLevel = parseInt(searchParams.get('level') || '1');

  // Quiz Setup States
  const [level, setLevel] = useState(defaultLevel);
  const [quizType, setQuizType] = useState('multiple_choice');
  const [qCount, setQCount] = useState(10);
  const [quizStarted, setQuizStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Game Loop States
  const [sessionId, setSessionId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currIndex, setCurrIndex] = useState(0);
  
  // Scoring & Submissions
  const [selectedOption, setSelectedOption] = useState(null);
  const [textAnswer, setTextAnswer] = useState('');
  
  // Sentence Reordering States
  const [orderedWords, setOrderedWords] = useState([]);
  const [shuffledWordsPool, setShuffledWordsPool] = useState([]);

  const [questionGraded, setQuestionGraded] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [correctAnswerText, setCorrectAnswerText] = useState('');
  const [quizFinished, setQuizFinished] = useState(false);
  const [summaryData, setSummaryData] = useState(null);

  // Timing
  const [startTime, setStartTime] = useState(null);

  // Audio Playback
  const { speak } = useSpeech();

  // Reset deck on level change
  useEffect(() => {
    setLevel(defaultLevel);
  }, [defaultLevel]);

  const handleStartQuiz = async () => {
    setLoading(true);
    setError('');
    setQuizFinished(false);
    setSummaryData(null);
    setCurrIndex(0);
    setQuestionGraded(false);
    
    try {
      const data = await api.post('/api/quiz/start', {
        hsk_level: level,
        quiz_type: quizType,
        question_count: qCount,
      });

      setSessionId(data.sessionId);
      setQuestions(data.questions);
      setQuizStarted(true);
      setStartTime(Date.now());
      
      // Auto speak if listening quiz first question
      if (quizType === 'listening' && data.questions[0]) {
        setTimeout(() => speak(data.questions[0].audioText, 'zh-CN'), 600);
      }

      // Initialize sentence order arrays
      if (quizType === 'sentence_order' && data.questions[0]) {
        setOrderedWords([]);
        setShuffledWordsPool([...data.questions[0].shuffledWords]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể khởi động bài quiz.');
    } finally {
      setLoading(false);
    }
  };

  // Reorder Sentence helper functions
  const addWordToSentence = (word, poolIndex) => {
    if (questionGraded) return;
    setOrderedWords([...orderedWords, word]);
    const nextPool = [...shuffledWordsPool];
    nextPool.splice(poolIndex, 1);
    setShuffledWordsPool(nextPool);
  };

  const removeWordFromSentence = (word, orderedIndex) => {
    if (questionGraded) return;
    const nextOrdered = [...orderedWords];
    nextOrdered.splice(orderedIndex, 1);
    setOrderedWords(nextOrdered);
    setShuffledWordsPool([...shuffledWordsPool, word]);
  };

  const currentQuestion = questions[currIndex];

  const handleGradeAnswer = async () => {
    if (questionGraded) return;

    let answerPayload = '';
    const timeTaken = Date.now() - startTime;

    if (quizType === 'multiple_choice' || quizType === 'listening') {
      if (!selectedOption) return;
      answerPayload = selectedOption.toString();
    } else if (quizType === 'fill_blank') {
      if (!textAnswer.trim()) return;
      answerPayload = textAnswer.trim();
    } else if (quizType === 'sentence_order') {
      if (orderedWords.length === 0) return;
      answerPayload = orderedWords.join('');
    }

    setLoading(true);
    try {
      const data = await api.post(`/api/quiz/${sessionId}/answer`, {
        vocab_id: currentQuestion.vocab_id,
        user_answer: answerPayload,
        time_taken_ms: timeTaken,
      });

      setIsCorrect(data.isCorrect);
      setCorrectAnswerText(data.correctAnswer);
      setQuestionGraded(true);

      if (data.quizCompleted) {
        // Fetch summary
        const summary = await api.get(`/api/quiz/${sessionId}/summary`);
        setSummaryData(summary);
      }
    } catch (e) {
      console.error('Failed to grade answer:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    // Reset inputs
    setSelectedOption(null);
    setTextAnswer('');
    setOrderedWords([]);
    setQuestionGraded(false);

    if (currIndex < questions.length - 1) {
      const nextIndex = currIndex + 1;
      setCurrIndex(nextIndex);
      setStartTime(Date.now());
      
      // Auto speak for next question if listening
      const nextQ = questions[nextIndex];
      if (quizType === 'listening' && nextQ) {
        setTimeout(() => speak(nextQ.audioText, 'zh-CN'), 200);
      }
      if (quizType === 'sentence_order' && nextQ) {
        setShuffledWordsPool([...nextQ.shuffledWords]);
      }
    } else {
      setQuizFinished(true);
      setQuizStarted(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {!quizStarted && !quizFinished ? (
        /* =================== QUIZ LAUNCH / SETUP STATE =================== */
        <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl max-w-xl mx-auto space-y-6">
          <div className="flex items-center space-x-3.5 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-2xl">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy dark:text-slate-100">Bắt đầu Luyện tập HSK</h1>
              <p className="text-xs text-slate-400">Chọn cấp độ và cấu hình loại câu hỏi</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 text-red-700 dark:text-red-300 rounded-xl p-3.5 text-xs flex items-center space-x-2">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            {/* Level selector */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Cấp độ HSK</label>
              <div className="grid grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`py-2 text-center rounded-xl font-bold transition-all ${
                      level === l
                        ? 'bg-navy dark:bg-gold text-white dark:text-navy-dark ring-2 ring-gold/30 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    HSK {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Quiz Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Loại câu hỏi</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'multiple_choice', label: 'Trắc nghiệm nghĩa từ', desc: 'Chọn nghĩa tiếng Anh/Việt tương ứng' },
                  { id: 'listening', label: 'Luyện nghe hiểu (TTS)', desc: 'Nghe phát âm và chọn chữ Hán đúng' },
                  { id: 'fill_blank', label: 'Điền từ vào ô trống', desc: 'Nhập chữ Hán hoặc Pinyin thiếu trong câu' },
                  { id: 'sentence_order', label: 'Sắp xếp câu', desc: 'Sắp xếp các chữ Hán xáo trộn thành câu hoàn chỉnh' },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setQuizType(type.id)}
                    className={`p-3 text-left rounded-xl border transition-all ${
                      quizType === type.id
                        ? 'bg-purple-50/20 dark:bg-purple-950/10 border-purple-550 ring-2 ring-purple-600/10 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                    }`}
                  >
                    <div className="text-sm font-bold text-navy dark:text-slate-100">{type.label}</div>
                    <div className="text-xxs text-slate-400 mt-0.5">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Count Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Số lượng câu hỏi</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((num) => (
                  <button
                    key={num}
                    onClick={() => setQCount(num)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      qCount === num
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    {num} câu
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleStartQuiz}
            disabled={loading}
            className="w-full py-3 bg-gold hover:bg-gold-dark text-navy-dark font-bold rounded-xl shadow-md transition-all mt-4 cursor-pointer"
          >
            {loading ? 'Đang chuẩn bị...' : 'Bắt đầu làm bài'}
          </button>
        </div>
      ) : quizStarted && currentQuestion ? (
        /* =================== QUIZ GAMEPLAY STATE =================== */
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Top Panel progress */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-850 rounded-2xl px-5 py-3 border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <span className="text-xs font-bold text-slate-450 font-sans">
              HSK {level} • {quizType === 'multiple_choice' ? 'Trắc nghiệm' : quizType === 'listening' ? 'Luyện nghe' : quizType === 'fill_blank' ? 'Điền từ' : 'Sắp xếp câu'}
            </span>
            <span className="text-sm font-mono font-bold text-navy dark:text-gold">
              Câu {currIndex + 1} / {questions.length}
            </span>
          </div>

          {/* Question Box Card */}
          <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-lg space-y-6">
            
            {/* Multiple Choice Card */}
            {quizType === 'multiple_choice' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Hãy chọn nghĩa đúng</div>
                  <div className="chinese-char text-6xl font-bold text-navy dark:text-gold select-none leading-none pt-2">
                    {currentQuestion.chinese}
                  </div>
                  <div className="text-sm text-slate-455 font-mono">{currentQuestion.pinyin}</div>
                </div>

                <div className="grid grid-cols-1 gap-2 pt-2">
                  {currentQuestion.options.map((opt) => (
                    <button
                      key={opt.id}
                      disabled={questionGraded}
                      onClick={() => setSelectedOption(opt.id)}
                      className={`p-4 text-left rounded-xl border font-sans text-sm transition-all flex justify-between items-center ${
                        selectedOption === opt.id
                          ? 'border-navy dark:border-gold bg-navy/5 dark:bg-gold/5 font-semibold text-navy dark:text-gold shadow-sm'
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 hover:border-slate-205'
                      }`}
                    >
                      <span>
                        {opt.vietnamese ? `${opt.vietnamese} (${opt.english})` : opt.english}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Listening Comprehension Card */}
            {quizType === 'listening' && (
              <div className="space-y-6">
                <div className="text-center space-y-3">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nghe phát âm và chọn chữ Hán</div>
                  <div className="flex justify-center py-4">
                    <button
                      onClick={() => speak(currentQuestion.audioText, 'zh-CN')}
                      className="p-6 rounded-full bg-gold/15 hover:bg-gold/25 text-gold-dark dark:text-gold transition-all shadow-md animate-pulse"
                      title="Nghe lại phát âm"
                    >
                      <Volume2 className="h-8 w-8" />
                    </button>
                  </div>
                  <div className="text-xs text-slate-405 font-mono italic">Pinyin trợ giúp: {currentQuestion.pinyin}</div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {currentQuestion.options.map((opt) => (
                    <button
                      key={opt.id}
                      disabled={questionGraded}
                      onClick={() => setSelectedOption(opt.id)}
                      className={`p-4 text-center rounded-xl border text-xl font-bold transition-all chinese-char ${
                        selectedOption === opt.id
                          ? 'border-navy dark:border-gold bg-navy/5 dark:bg-gold/5 text-navy dark:text-gold shadow-sm'
                          : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 hover:border-slate-205'
                      }`}
                    >
                      {opt.chinese}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Fill-in-the-Blank Card */}
            {quizType === 'fill_blank' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Điền chữ Hán hoặc Pinyin thiếu</div>
                  
                  {/* Blanked Sentence display */}
                  <div className="chinese-char text-3xl font-semibold text-navy dark:text-slate-100 select-none py-4 leading-normal">
                    {currentQuestion.sentence}
                  </div>
                  
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {currentQuestion.sentenceEn}
                  </div>
                  <div className="text-xs text-slate-450 font-mono">
                    {currentQuestion.sentenceVi}
                  </div>
                </div>

                <div className="pt-2">
                  <input
                    type="text"
                    required
                    disabled={questionGraded}
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Nhập chữ Hán hoặc pinyin..."
                    className="block w-full text-center px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-xl text-lg font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-550 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Sentence Order Card */}
            {quizType === 'sentence_order' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Xếp các chữ Hán thành câu đúng</div>
                  
                  {/* Hints */}
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-250 py-1.5">
                    {currentQuestion.english}
                  </div>
                  {currentQuestion.vietnamese && (
                    <div className="text-xs text-slate-450 font-mono italic mb-2">
                      {currentQuestion.vietnamese}
                    </div>
                  )}
                </div>

                {/* Selection Canvas (Ordered selection sequence) */}
                <div className="min-h-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap gap-2 items-center justify-center bg-slate-50/30 dark:bg-slate-900/30">
                  {orderedWords.length === 0 ? (
                    <span className="text-xs text-slate-400 italic">Nhấp vào từ ở dưới để chọn</span>
                  ) : (
                    orderedWords.map((word, idx) => (
                      <button
                        key={idx}
                        disabled={questionGraded}
                        onClick={() => removeWordFromSentence(word, idx)}
                        className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 text-navy dark:text-white border border-slate-200 dark:border-slate-705 rounded-xl text-lg font-bold shadow-sm cursor-pointer chinese-char"
                      >
                        {word}
                      </button>
                    ))
                  )}
                </div>

                {/* Shuffled pool choices */}
                <div className="flex flex-wrap gap-2 justify-center pt-2">
                  {shuffledWordsPool.map((word, idx) => (
                    <button
                      key={idx}
                      disabled={questionGraded}
                      onClick={() => addWordToSentence(word, idx)}
                      className="px-3.5 py-1.5 bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 border border-purple-200/50 text-purple-700 dark:text-purple-300 rounded-xl text-lg font-bold shadow-sm cursor-pointer chinese-char transition-all hover:scale-105 active:scale-95"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Answer feedback panels */}
            {questionGraded && (
              <div
                className={`rounded-2xl p-4 border flex items-start space-x-3 transition-all ${
                  isCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 dark:bg-red-955/15 border-red-200 dark:border-red-900/30 text-red-800 dark:text-red-300'
                }`}
              >
                <div
                  className={`p-1.5 rounded-full ${
                    isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                  }`}
                >
                  {isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-extrabold">{isCorrect ? 'Chính xác!' : 'Sai rồi!'}</div>
                  <div className="text-xs">
                    Đáp án đúng:{' '}
                    <span className="font-bold underline chinese-char">{correctAnswerText}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar inside Gameplay */}
            <div className="flex justify-end pt-2">
              {!questionGraded ? (
                <button
                  onClick={handleGradeAnswer}
                  disabled={
                    (quizType === 'multiple_choice' || quizType === 'listening')
                      ? !selectedOption
                      : quizType === 'fill_blank'
                      ? !textAnswer.trim()
                      : orderedWords.length === 0
                  }
                  className="py-2.5 px-6 bg-navy text-white hover:bg-navy-light font-bold rounded-xl shadow-md transition-all disabled:opacity-50 cursor-pointer text-sm"
                >
                  Kiểm tra đáp án
                </button>
              ) : (
                <button
                  onClick={handleNextQuestion}
                  className="py-2.5 px-6 bg-gold hover:bg-gold-dark text-navy-dark font-bold rounded-xl shadow-md transition-all cursor-pointer text-sm flex items-center space-x-1"
                >
                  <span>Câu tiếp theo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* =================== QUIZ FINISHED / SUMMARY STATE =================== */
        <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-full flex items-center justify-center mx-auto">
              <Award className="h-10 w-10 animate-bounce" />
            </div>
            <h1 className="text-3xl font-extrabold text-navy dark:text-gold">Hoàn thành bài kiểm tra!</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Cảm ơn bạn đã hoàn thành bài quiz. Các kết quả đã được ghi nhận để tối ưu thuật toán ôn tập SRS của riêng bạn!
            </p>
          </div>

          {/* Stats Aggregates */}
          {summaryData?.session && (
            <div className="grid grid-cols-3 gap-4 border-t border-b border-slate-100 dark:border-slate-800/50 py-5 my-2">
              <div className="text-center space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Điểm số</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-450 font-mono">
                  {summaryData.session.correct_answers} / {summaryData.session.total_questions}
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tỷ lệ đúng</div>
                <div className="text-2xl font-black text-navy dark:text-gold font-mono">
                  {Math.round((summaryData.session.correct_answers / summaryData.session.total_questions) * 100)}%
                </div>
              </div>
              <div className="text-center space-y-1">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Thời gian</div>
                <div className="text-2xl font-black text-slate-700 dark:text-slate-300 font-mono flex items-center justify-center space-x-1">
                  <Clock className="h-5 w-5 text-slate-400" />
                  <span>{summaryData.session.duration_seconds}s</span>
                </div>
              </div>
            </div>
          )}

          {/* List of answers */}
          {summaryData?.answers && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Chi tiết câu hỏi</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {summaryData.answers.map((answer, index) => (
                  <div
                    key={answer.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-sm ${
                      answer.is_correct === 1
                        ? 'bg-emerald-500/5 border-emerald-100 dark:border-emerald-950/20'
                        : 'bg-red-500/5 border-red-105 dark:border-red-950/20'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-xs text-slate-400 font-bold">#{index + 1}</span>
                      <div>
                        <div className="chinese-char text-base font-bold text-navy dark:text-slate-100">
                          {answer.chinese}
                        </div>
                        <div className="text-xs text-slate-450">{answer.pinyin}</div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-semibold text-slate-500">
                        Đáp án của bạn:{' '}
                        <span className={`font-bold ${answer.is_correct === 1 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {answer.user_answer}
                        </span>
                      </div>
                      {answer.is_correct !== 1 && (
                        <div className="text-xxs text-slate-400 italic">Đúng: {answer.correct_answer}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/50">
            <button
              onClick={handleStartQuiz}
              className="flex-1 py-3 px-4 bg-gold hover:bg-gold-dark text-navy-dark font-extrabold rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1.5"
            >
              <RefreshCw className="h-4.5 w-4.5" />
              <span>Luyện tập lại</span>
            </button>
            <button
              onClick={() => {
                setQuizFinished(false);
                setQuizStarted(false);
              }}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
            >
              Thay đổi thiết lập
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
