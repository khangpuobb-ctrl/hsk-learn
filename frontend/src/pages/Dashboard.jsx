import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BarChart2, Flame, Award, HelpCircle, CheckCircle, Clock, BookOpen, ThumbsUp, AlertTriangle } from 'lucide-react';
import { useProgress } from '../hooks/useProgress';

export function Dashboard() {
  const { progressData, loading } = useProgress();
  const navigate = useNavigate();

  const summary = progressData?.summary || {
    totalLearned: 0,
    breakdown: { learning: 0, review: 0, mastered: 0 },
    streak: 0,
    dueReviews: 0,
  };

  const quizzes = progressData?.quizzes || {
    total: 0,
    questions: 0,
    correct: 0,
    avgScore: 0,
  };

  const dueList = progressData?.due || [];
  const failedList = progressData?.failed || [];
  const recentList = progressData?.recent || [];

  // Achievement calculation
  const achievements = [
    {
      id: 'streak_3',
      title: 'Chăm Chỉ',
      desc: 'Đạt chuỗi học tập từ 3 ngày liên tiếp trở lên.',
      unlocked: summary.streak >= 3,
      icon: Flame,
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'vocab_5',
      title: 'Tân Binh',
      desc: 'Bắt đầu học ít nhất 5 từ vựng HSK.',
      unlocked: summary.totalLearned >= 5,
      icon: BookOpen,
      color: 'from-teal-500 to-emerald-500',
    },
    {
      id: 'vocab_50',
      title: 'Chiến Binh HSK',
      desc: 'Bắt đầu học từ 50 từ vựng HSK trở lên.',
      unlocked: summary.totalLearned >= 50,
      icon: Award,
      color: 'from-blue-500 to-indigo-500',
    },
    {
      id: 'quiz_master',
      title: 'Trạng Nguyên',
      desc: 'Đạt điểm thi quiz trung bình từ 85% trở lên.',
      unlocked: quizzes.total >= 3 && quizzes.avgScore >= 85,
      icon: CheckCircle,
      color: 'from-purple-500 to-pink-500',
    },
  ];

  // SVG Chart Mock Study Activity data (7 days)
  const studyActivity = [
    { day: 'Thứ 2', count: 12 },
    { day: 'Thứ 3', count: 19 },
    { day: 'Thứ 4', count: 15 },
    { day: 'Thứ 5', count: 28 },
    { day: 'Thứ 6', count: 22 },
    { day: 'Thứ 7', count: 32 },
    { day: 'Chủ Nhật', count: summary.dueReviews === 0 ? 30 : 18 },
  ];

  const maxVal = Math.max(...studyActivity.map(d => d.count)) || 10;
  const chartHeight = 140;
  const chartWidth = 500;
  const points = studyActivity.map((d, i) => {
    const x = (i * (chartWidth - 60)) / 6 + 40;
    const y = chartHeight - 20 - (d.count * (chartHeight - 40)) / maxVal;
    return { x, y, ...d };
  });

  const svgPathD = points.reduce((path, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${path} L ${p.x} ${p.y}`;
  }, '');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 select-none">
      {/* Page Title */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-gold/15 text-gold-dark dark:text-gold rounded-xl">
          <BarChart2 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-slate-100">Bảng tiến độ cá nhân</h1>
          <p className="text-xs text-slate-400">Xem phân tích kết quả học tập và huy hiệu thành tích</p>
        </div>
      </div>

      {/* Grid: Left Column Charts, Right Column Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Columns (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Study Activity Curve (SVG Line Chart) */}
          <div className="bg-white dark:bg-slate-850 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-md">
            <h2 className="text-lg font-bold text-navy dark:text-gold mb-1">Tần suất học tập 7 ngày</h2>
            <p className="text-xs text-slate-400 mb-6">Số từ đã hoàn thành học và ôn tập mỗi ngày gần nhất</p>
            
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[400px] overflow-visible">
                {/* Grids */}
                {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                  const y = chartHeight - 20 - r * (chartHeight - 40);
                  const label = Math.round(r * maxVal);
                  return (
                    <g key={idx}>
                      <line x1="40" y1={y} x2={chartWidth - 20} y2={y} stroke="#E2E8F0" strokeWidth="0.5" className="dark:stroke-slate-800" />
                      <text x="15" y={y + 4} className="text-[10px] font-mono fill-slate-400 font-bold" textAnchor="middle">{label}</text>
                    </g>
                  );
                })}

                {/* Path Curve */}
                <path d={svgPathD} fill="none" stroke="#E8C96B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                
                {/* Area Gradient */}
                <path
                  d={`${svgPathD} L ${points[points.length - 1].x} ${chartHeight - 20} L ${points[0].x} ${chartHeight - 20} Z`}
                  fill="url(#grad)"
                  className="opacity-20"
                />

                <defs>
                  <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#E8C96B" />
                    <stop offset="100%" stopColor="#F8F6F1" />
                  </linearGradient>
                </defs>

                {/* Points */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle cx={p.x} cy={p.y} r="5" className="fill-navy dark:fill-gold stroke-white stroke-2" />
                    <text x={p.x} y={chartHeight - 4} className="text-[10px] font-bold fill-slate-400" textAnchor="middle">{p.day}</text>
                    <text x={p.x} y={p.y - 10} className="text-[9px] font-bold fill-slate-700 dark:fill-slate-300 font-mono" textAnchor="middle">{p.count}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          {/* Achievement Badges */}
          <div className="bg-white dark:bg-slate-855 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-md">
            <h2 className="text-lg font-bold text-navy dark:text-gold mb-1">Huy hiệu thành tích</h2>
            <p className="text-xs text-slate-450 mb-6">Mở khóa huy hiệu bằng cách hoàn thành các cột mốc học tập</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {achievements.map((badge) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={badge.id}
                    className={`flex items-center space-x-4 p-4 rounded-2xl border transition-all ${
                      badge.unlocked
                        ? 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-850 dark:to-slate-900 border-slate-200 dark:border-slate-800'
                        : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-850 opacity-40 select-none'
                    }`}
                  >
                    <div
                      className={`p-3 rounded-xl text-white shadow-sm bg-gradient-to-r ${
                        badge.unlocked ? badge.color : 'from-slate-400 to-slate-500'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          {badge.title}
                        </span>
                        {badge.unlocked && (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Đã mở
                          </span>
                        )}
                      </div>
                      <p className="text-xxs text-slate-450 mt-1 leading-normal">
                        {badge.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (Span 1) */}
        <div className="space-y-6">
          {/* Due List Panel */}
          <div className="bg-white dark:bg-slate-850 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-navy dark:text-gold flex items-center">
                <Clock className="h-4.5 w-4.5 mr-2 text-gold" />
                Ôn tập hôm nay ({summary.dueReviews})
              </h2>
              {dueList.length > 0 && (
                <Link
                  to="/flashcard"
                  className="text-xs font-bold text-gold-dark dark:text-gold hover:underline"
                >
                  Học ngay
                </Link>
              )}
            </div>

            {dueList.length > 0 ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {dueList.map((word) => (
                  <div
                    key={word.vocab_id}
                    className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <span className="chinese-char text-lg font-bold text-navy dark:text-slate-100 mr-2">
                        {word.chinese}
                      </span>
                      <span className="text-xxs text-slate-400 font-mono">{word.pinyin}</span>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase text-xxs font-mono">
                      {word.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
                🎉 Bạn đã hoàn thành tất cả thẻ cần ôn tập ngày hôm nay!
              </div>
            )}
          </div>

          {/* Failed Words Panel */}
          <div className="bg-white dark:bg-slate-855 rounded-3xl p-5 border border-slate-100 dark:border-slate-800/80 shadow-md">
            <h2 className="text-base font-bold text-navy dark:text-gold flex items-center mb-4">
              <AlertTriangle className="h-4.5 w-4.5 mr-2 text-red-500" />
              Từ hay sai nhất
            </h2>

            {failedList.length > 0 ? (
              <div className="space-y-2.5">
                {failedList.map((word) => (
                  <div
                    key={word.vocab_id}
                    className="p-3 bg-red-500/5 border border-red-100 dark:border-red-950/20 rounded-xl flex justify-between items-center text-sm"
                  >
                    <div>
                      <div className="chinese-char text-base font-bold text-navy dark:text-slate-100">
                        {word.chinese}
                      </div>
                      <div className="text-xxs text-slate-450">{word.pinyin}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-red-500 font-mono">
                        Sai {word.wrong_count} lần
                      </span>
                      <div className="text-xxs text-slate-400 font-mono">Đúng {word.correct_count} lần</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10">
                👍 Chưa phát hiện từ vựng nào hay sai. Rất tuyệt vời!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
