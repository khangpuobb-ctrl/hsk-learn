import { Hono } from 'hono';
import { Env } from '../index';
import { calculateNextReview } from '../lib/sm2';

const progress = new Hono<{ Bindings: Env }>();

// Helper to get streak
async function getLearningStreak(db: D1Database, userId: string): Promise<number> {
  try {
    // Select all unique YYYY-MM-DD dates from vocabulary reviews and quiz completions
    const reviews = await db.prepare(`
      SELECT DISTINCT substr(last_reviewed, 1, 10) as date_str 
      FROM user_vocabulary_progress 
      WHERE user_id = ? AND last_reviewed IS NOT NULL
    `).bind(userId).all<{ date_str: string }>();

    const quizzes = await db.prepare(`
      SELECT DISTINCT substr(completed_at, 1, 10) as date_str 
      FROM quiz_sessions 
      WHERE user_id = ? AND completed_at IS NOT NULL
    `).bind(userId).all<{ date_str: string }>();

    const allDatesSet = new Set<string>();
    reviews.results.forEach(r => allDatesSet.add(r.date_str));
    quizzes.results.forEach(q => allDatesSet.add(q.date_str));

    const sortedDates = Array.from(allDatesSet).sort((a, b) => b.localeCompare(a));
    if (sortedDates.length === 0) return 0;

    // Helper to format Date to YYYY-MM-DD in local time
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    // If there is no activity today or yesterday, streak is broken (0)
    if (!allDatesSet.has(todayStr) && !allDatesSet.has(yesterdayStr)) {
      return 0;
    }

    let streak = 0;
    let currentCheck = allDatesSet.has(todayStr) ? new Date() : yesterday;

    while (true) {
      const checkStr = formatDate(currentCheck);
      if (allDatesSet.has(checkStr)) {
        streak++;
        // Go to previous day
        currentCheck.setDate(currentCheck.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  } catch (e) {
    console.error('Streak calculation error:', e);
    return 0;
  }
}

// GET /api/progress
progress.get('/', async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const userId = payload.sub;

  try {
    // 1. Vocabulary totals by status
    const statusCounts = await c.env.DB.prepare(`
      SELECT status, COUNT(*) as count 
      FROM user_vocabulary_progress 
      WHERE user_id = ?
      GROUP BY status
    `).bind(userId).all<{ status: string; count: number }>();

    const stats = {
      new: 0,
      learning: 0,
      review: 0,
      mastered: 0,
      total: 0,
    };

    statusCounts.results.forEach(row => {
      if (row.status === 'learning') stats.learning = row.count;
      else if (row.status === 'review') stats.review = row.count;
      else if (row.status === 'mastered') stats.mastered = row.count;
      stats.total += row.count;
    });

    // 2. Next review count (due count)
    const dueRes = await c.env.DB.prepare(`
      SELECT COUNT(*) as count 
      FROM user_vocabulary_progress 
      WHERE user_id = ? AND next_review <= datetime('now') AND status != 'mastered'
    `).bind(userId).first<{ count: number }>();
    const dueReviewsCount = dueRes?.count || 0;

    // 3. Level completion stats
    const levelStats = await c.env.DB.prepare(`
      SELECT 
        v.hsk_level, 
        COUNT(v.id) as total_words, 
        COUNT(p.vocab_id) as started_words,
        SUM(CASE WHEN p.status = 'mastered' THEN 1 ELSE 0 END) as mastered_words
      FROM vocabulary v
      LEFT JOIN user_vocabulary_progress p ON v.id = p.vocab_id AND p.user_id = ?
      GROUP BY v.hsk_level
      ORDER BY v.hsk_level ASC
    `).bind(userId).all<{ hsk_level: number; total_words: number; started_words: number; mastered_words: number }>();

    // 4. Streak
    const streak = await getLearningStreak(c.env.DB, userId);

    // 5. Quiz aggregate stats
    const quizStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as total_quizzes,
        SUM(total_questions) as total_questions,
        SUM(correct_answers) as total_correct,
        AVG(CAST(correct_answers AS REAL) / total_questions * 100) as average_score
      FROM quiz_sessions
      WHERE user_id = ?
    `).bind(userId).first<{ total_quizzes: number; total_questions: number; total_correct: number; average_score: number | null }>();

    // 6. Recent reviews list (last 10 words reviewed)
    const recentWords = await c.env.DB.prepare(`
      SELECT v.chinese, v.pinyin, v.english, p.status, p.last_reviewed
      FROM user_vocabulary_progress p
      JOIN vocabulary v ON p.vocab_id = v.id
      WHERE p.user_id = ? AND p.last_reviewed IS NOT NULL
      ORDER BY p.last_reviewed DESC
      LIMIT 10
    `).bind(userId).all();

    // 7. Top 5 most wrong words
    const failedWords = await c.env.DB.prepare(`
      SELECT v.id as vocab_id, v.chinese, v.pinyin, v.english, p.wrong_count, p.correct_count
      FROM user_vocabulary_progress p
      JOIN vocabulary v ON p.vocab_id = v.id
      WHERE p.user_id = ? AND p.wrong_count > 0
      ORDER BY p.wrong_count DESC
      LIMIT 5
    `).bind(userId).all();

    // 8. Due reviews (list of actual words)
    const dueWordsList = await c.env.DB.prepare(`
      SELECT v.id as vocab_id, v.chinese, v.pinyin, v.english, v.vietnamese, p.status, p.next_review
      FROM user_vocabulary_progress p
      JOIN vocabulary v ON p.vocab_id = v.id
      WHERE p.user_id = ? AND p.next_review <= datetime('now') AND p.status != 'mastered'
      ORDER BY p.next_review ASC
      LIMIT 10
    `).bind(userId).all();

    return c.json({
      summary: {
        totalLearned: stats.total,
        breakdown: {
          learning: stats.learning,
          review: stats.review,
          mastered: stats.mastered,
        },
        streak,
        dueReviews: dueReviewsCount,
      },
      levels: levelStats.results,
      quizzes: {
        total: quizStats?.total_quizzes || 0,
        questions: quizStats?.total_questions || 0,
        correct: quizStats?.total_correct || 0,
        avgScore: quizStats?.average_score ? Math.round(quizStats.average_score) : 0,
      },
      recent: recentWords.results,
      failed: failedWords.results,
      due: dueWordsList.results,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error fetching progress' }, 500);
  }
});

// POST /api/progress/update (updates SRS based on flashcard response)
progress.post('/update', async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const userId = payload.sub;

  const { vocab_id, quality } = await c.req.json();
  if (vocab_id === undefined || quality === undefined) {
    return c.json({ error: 'vocab_id and quality are required' }, 400);
  }

  const q = parseInt(quality);
  if (q < 0 || q > 5) {
    return c.json({ error: 'quality must be between 0 and 5' }, 400);
  }

  try {
    // 1. Get existing SRS record
    const existing = await c.env.DB.prepare(`
      SELECT status, correct_count, wrong_count, ease_factor, interval_days 
      FROM user_vocabulary_progress 
      WHERE user_id = ? AND vocab_id = ?
    `).bind(userId, vocab_id).first<{
      status: string;
      correct_count: number;
      wrong_count: number;
      ease_factor: number;
      interval_days: number;
    }>();

    let easeFactor = 2.5;
    let intervalDays = 1;
    let correctCount = 0;
    let wrongCount = 0;

    if (existing) {
      easeFactor = existing.ease_factor;
      intervalDays = existing.interval_days;
      correctCount = existing.correct_count;
      wrongCount = existing.wrong_count;
    }

    // Update counts based on response
    if (q >= 3) {
      correctCount++;
    } else {
      wrongCount++;
    }

    // 2. Run SM-2 algorithm
    const nextSrs = calculateNextReview(easeFactor, intervalDays, q);

    // 3. Determine status progression
    // 'new' -> 'learning' -> 'review' -> 'mastered'
    let newStatus = 'learning';
    if (q < 3) {
      newStatus = 'learning';
    } else if (nextSrs.interval >= 21) {
      newStatus = 'mastered';
    } else if (nextSrs.interval >= 7) {
      newStatus = 'review';
    }

    const nowStr = new Date().toISOString();

    // 4. Insert or Update into user_vocabulary_progress
    if (existing) {
      await c.env.DB.prepare(`
        UPDATE user_vocabulary_progress
        SET status = ?, correct_count = ?, wrong_count = ?, ease_factor = ?, interval_days = ?, next_review = ?, last_reviewed = ?
        WHERE user_id = ? AND vocab_id = ?
      `)
        .bind(newStatus, correctCount, wrongCount, nextSrs.easeFactor, nextSrs.interval, nextSrs.nextReview, nowStr, userId, vocab_id)
        .run();
    } else {
      await c.env.DB.prepare(`
        INSERT INTO user_vocabulary_progress (user_id, vocab_id, status, correct_count, wrong_count, ease_factor, interval_days, next_review, last_reviewed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
        .bind(userId, vocab_id, newStatus, correctCount, wrongCount, nextSrs.easeFactor, nextSrs.interval, nextSrs.nextReview, nowStr)
        .run();
    }

    return c.json({
      success: true,
      srs: {
        status: newStatus,
        easeFactor: nextSrs.easeFactor,
        intervalDays: nextSrs.interval,
        nextReview: nextSrs.nextReview,
        correctCount,
        wrongCount,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error updating SRS progress' }, 500);
  }
});

export default progress;
