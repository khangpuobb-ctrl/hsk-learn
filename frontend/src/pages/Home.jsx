import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Flame, Layers, Award, BookOpen, CheckSquare, Sparkles, BookMarked, ArrowRight } from 'lucide-react';
import { useProgress } from '../hooks/useProgress';
import { ProgressBar } from '../components/ProgressBar';

export function Home() {
  const { progressData, loading } = useProgress();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user')) || {};

  const summary = progressData?.summary || {
    totalLearned: 0,
    breakdown: { learning: 0, review: 0, mastered: 0 },
    streak: 0,
    dueReviews: 0,
  };

  const levels = progressData?.levels || [
    { hsk_level: 1, total_words: 150, started_words: 0, mastered_words: 0 },
    { hsk_level: 2, total_words: 150, started_words: 0, mastered_words: 0 },
    { hsk_level: 3, total_words: 300, started_words: 0, mastered_words: 0 },
    { hsk_level: 4, total_words: 600, started_words: 0, mastered_words: 0 },
    { hsk_level: 5, total_words: 1300, started_words: 0, mastered_words: 0 },
    { hsk_level: 6, total_words: 2500, started_words: 0, mastered_words: 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 select-none">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy to-navy-light text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-navy-light relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 opacity-10">
          <BookMarked className="h-64 w-64 text-gold" />
        </div>
        <div className="relative z-10 max-w-xl space-y-3">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-gold/20 text-gold rounded-full text-xs font-semibold uppercase tracking-wider border border-gold/30">
            <Sparkles className="h-3 w-3" />
            <span>Mục tiêu HSK {user.hsk_target_level || 1}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Chào {user.display_name || 'bạn học'}, Học hôm nay, giỏi ngày mai!
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Học từ vựng lặp lại ngắt quãng (SRS), luyện đọc bài viết song ngữ Anh-Trung, và thử thách bản thân với các bài trắc nghiệm thông minh.
          </p>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak card */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-md flex items-center space-x-4">
          <div className="p-3.5 bg-orange-50 dark:bg-orange-950/20 text-orange-655 dark:text-orange-400 rounded-2xl">
            <Flame className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Streak Ngày</div>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
              {summary.streak} <span className="text-sm font-normal text-slate-500">ngày</span>
            </div>
          </div>
        </div>

        {/* Due cards */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-md flex items-center space-x-4">
          <div className="p-3.5 bg-red-50 dark:bg-red-955/20 text-red-655 dark:text-red-400 rounded-2xl">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Cần ôn tập</div>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
              {summary.dueReviews} <span className="text-sm font-normal text-slate-500">từ</span>
            </div>
          </div>
        </div>

        {/* Total learned */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-md flex items-center space-x-4">
          <div className="p-3.5 bg-teal-50 dark:bg-teal-950/20 text-teal-655 dark:text-teal-400 rounded-2xl">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Từ đã học</div>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
              {summary.totalLearned} <span className="text-sm font-normal text-slate-500">từ</span>
            </div>
          </div>
        </div>

        {/* Quiz sessions */}
        <div className="bg-white dark:bg-slate-850 rounded-2xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-md flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-655 dark:text-indigo-400 rounded-2xl">
            <CheckSquare className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Bài Quiz</div>
            <div className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
              {progressData?.quizzes?.total || 0} <span className="text-sm font-normal text-slate-500">bài</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/flashcard"
          className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-48"
        >
          <div className="space-y-2">
            <div className="p-3 bg-gold/15 text-gold-dark dark:text-gold w-fit rounded-xl">
              <Award className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-navy dark:text-slate-100">Flashcards Lặp Lại</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Ôn tập từ vựng chuẩn HSK với thuật toán thông minh SM-2.
            </p>
          </div>
          <div className="flex items-center text-sm font-semibold text-gold-dark dark:text-gold group-hover:translate-x-1.5 transition-transform mt-4">
            Bắt đầu học <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </Link>

        <Link
          to="/reading"
          className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-48"
        >
          <div className="space-y-2">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 w-fit rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-navy dark:text-slate-100">Bài Đọc Song Ngữ</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Đọc các câu chuyện song ngữ HSK, nhấp vào từ để tra từ điển tức thì.
            </p>
          </div>
          <div className="flex items-center text-sm font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1.5 transition-transform mt-4">
            Bắt đầu đọc <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </Link>

        <Link
          to="/quiz"
          className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800/80 p-6 rounded-2xl shadow-sm hover:shadow-md transition-all group flex flex-col justify-between h-48"
        >
          <div className="space-y-2">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 w-fit rounded-xl">
              <CheckSquare className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-navy dark:text-slate-100">Làm Bài Kiểm Tra</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Luyện nghe, làm trắc nghiệm, điền từ vào chỗ trống, và ghép từ.
            </p>
          </div>
          <div className="flex items-center text-sm font-semibold text-purple-600 dark:text-purple-400 group-hover:translate-x-1.5 transition-transform mt-4">
            Luyện tập ngay <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </Link>
      </div>

      {/* Level Completion Progression */}
      <div className="bg-white dark:bg-slate-850 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-800/80 shadow-md">
        <h2 className="text-2xl font-bold text-navy dark:text-gold mb-6 flex items-center">
          <Layers className="h-5.5 w-5.5 mr-2.5 text-gold" />
          Tiến trình cấp độ HSK
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {levels.map((level) => {
            const levelNum = level.hsk_level;
            // Support database keys which might be direct results or default properties
            const totalWords = level.total_words || 150;
            const masteredWords = level.mastered_words || 0;
            const startedWords = level.started_words || 0;

            return (
              <div
                key={levelNum}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-2xl p-5 space-y-4 hover:border-gold/25 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                      Cấp độ HSK {levelNum}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tổng số: {totalWords} từ vựng
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-navy/10 dark:bg-navy-light text-navy dark:text-slate-350">
                    Đang học: {startedWords} từ
                  </span>
                </div>

                <ProgressBar
                  value={masteredWords}
                  max={totalWords}
                  label="Từ đã nhuần nhuyễn (SRS Mastered)"
                />

                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-450 pt-1 border-t border-slate-100 dark:border-slate-800/30">
                  <span>Hoàn thành: {masteredWords} / {totalWords} từ</span>
                  <Link
                    to={`/flashcard?level=${levelNum}`}
                    className="font-semibold text-gold-dark dark:text-gold hover:underline"
                  >
                    Học cấp độ này →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
