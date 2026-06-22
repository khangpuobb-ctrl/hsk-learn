import { Hono } from 'hono';
import { Env } from '../index';
import { calculateNextReview } from '../lib/sm2';

const quiz = new Hono<{ Bindings: Env }>();

interface VocabRow {
  id: number;
  hsk_level: number;
  chinese: string;
  pinyin: string;
  english: string;
  vietnamese: string | null;
  part_of_speech: string | null;
  example_zh: string | null;
  example_pinyin: string | null;
  example_en: string | null;
}

// POST /api/quiz/start
quiz.post('/start', async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const userId = payload.sub;

  const { hsk_level, quiz_type, question_count } = await c.req.json();
  
  const level = parseInt(hsk_level || '1');
  const type = quiz_type || 'multiple_choice'; // 'multiple_choice', 'listening', 'fill_blank', 'sentence_order'
  const count = parseInt(question_count || '10');

  try {
    // 1. Fetch vocabulary pool for this level
    const vocabPoolRes = await c.env.DB.prepare(`
      SELECT * FROM vocabulary WHERE hsk_level = ?
    `).bind(level).all<VocabRow>();

    const vocabPool = vocabPoolRes.results;
    if (vocabPool.length < 4) {
      return c.json({ error: 'Not enough vocabulary words in this level to start a quiz.' }, 400);
    }

    // 2. Select random vocabulary words for the questions
    // Shuffle pool
    const shuffledPool = [...vocabPool].sort(() => 0.5 - Math.random());
    const targetVocabs = shuffledPool.slice(0, Math.min(count, shuffledPool.length));

    // 3. Create the quiz session record in D1
    const sessionRes = await c.env.DB.prepare(`
      INSERT INTO quiz_sessions (user_id, hsk_level, quiz_type, total_questions, correct_answers, duration_seconds)
      VALUES (?, ?, ?, ?, 0, 0)
    `)
      .bind(userId, level, type, targetVocabs.length)
      .run();

    const sessionId = sessionRes.meta.last_row_id || 1;

    // 4. Generate specific questions based on quiz_type
    const questions = targetVocabs.map((vocab, index) => {
      // Find 3 distractors
      const distractors = vocabPool
        .filter(v => v.id !== vocab.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3);

      const options = [vocab, ...distractors].sort(() => 0.5 - Math.random());

      if (type === 'multiple_choice') {
        return {
          id: index + 1,
          vocab_id: vocab.id,
          type,
          chinese: vocab.chinese,
          pinyin: vocab.pinyin,
          options: options.map(o => ({
            id: o.id,
            english: o.english,
            vietnamese: o.vietnamese || '',
          })),
          correctOptionId: vocab.id,
        };
      } else if (type === 'listening') {
        return {
          id: index + 1,
          vocab_id: vocab.id,
          type,
          pinyin: vocab.pinyin,
          audioText: vocab.chinese, // will be spoken via Web Speech API
          options: options.map(o => ({
            id: o.id,
            chinese: o.chinese,
          })),
          correctOptionId: vocab.id,
        };
      } else if (type === 'fill_blank') {
        // Find a word with an example sentence. If not, use standard sentence placeholders.
        const exampleZh = vocab.example_zh || `${vocab.chinese}是好词。`;
        const exampleEn = vocab.example_en || 'This is a good word.';
        const exampleVi = vocab.example_pinyin || ''; // use pinyin or vietnamese if available

        // Blank out the target word from the sentence
        const blankedSentence = exampleZh.replace(new RegExp(vocab.chinese, 'g'), '____');

        return {
          id: index + 1,
          vocab_id: vocab.id,
          type,
          chinese: vocab.chinese,
          pinyin: vocab.pinyin,
          sentence: blankedSentence,
          sentenceEn: exampleEn,
          sentenceVi: vocab.example_pinyin || '', // example pinyin
          correctAnswer: vocab.chinese,
        };
      } else {
        // 'sentence_order'
        const sentence = vocab.example_zh || `我想去北京。`;
        // Split sentence into characters (filtering punctuation)
        const cleanSentence = sentence.replace(/[。，！？、]/g, '');
        const words = Array.from(cleanSentence);
        const shuffledWords = [...words].sort(() => 0.5 - Math.random());

        return {
          id: index + 1,
          vocab_id: vocab.id,
          type,
          english: vocab.example_en || '',
          vietnamese: vocab.example_pinyin || '', // example pinyin
          shuffledWords,
          correctAnswer: cleanSentence,
        };
      }
    });

    return c.json({
      sessionId,
      questions,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error during quiz start' }, 500);
  }
});

// POST /api/quiz/:session_id/answer
quiz.post('/:session_id/answer', async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const userId = payload.sub;
  const sessionId = parseInt(c.req.param('session_id'));

  const { vocab_id, user_answer, time_taken_ms } = await c.req.json();

  try {
    // 1. Fetch vocabulary item to get the correct answer
    const vocab = await c.env.DB.prepare(`
      SELECT * FROM vocabulary WHERE id = ?
    `).bind(vocab_id).first<VocabRow>();

    if (!vocab) {
      return c.json({ error: 'Vocabulary item not found' }, 404);
    }

    // 2. Fetch quiz session to verify type
    const session = await c.env.DB.prepare(`
      SELECT quiz_type, total_questions, correct_answers FROM quiz_sessions WHERE id = ? AND user_id = ?
    `).bind(sessionId, userId).first<{ quiz_type: string; total_questions: number; correct_answers: number }>();

    if (!session) {
      return c.json({ error: 'Quiz session not found' }, 404);
    }

    // 3. Grade answer
    let isCorrect = 0;
    let correctAnswerText = '';

    if (session.quiz_type === 'multiple_choice') {
      correctAnswerText = vocab.english;
      isCorrect = parseInt(user_answer) === vocab.id ? 1 : 0;
    } else if (session.quiz_type === 'listening') {
      correctAnswerText = vocab.chinese;
      isCorrect = parseInt(user_answer) === vocab.id ? 1 : 0;
    } else if (session.quiz_type === 'fill_blank') {
      correctAnswerText = vocab.chinese;
      // Accept either pinyin or character
      const cleanAnswer = user_answer.trim().toLowerCase();
      const matchPinyin = cleanAnswer === vocab.pinyin.trim().toLowerCase();
      const matchChar = cleanAnswer === vocab.chinese.trim();
      isCorrect = (matchPinyin || matchChar) ? 1 : 0;
    } else if (session.quiz_type === 'sentence_order') {
      const sentence = vocab.example_zh || `我想去北京。`;
      const cleanSentence = sentence.replace(/[。，！？、]/g, '');
      correctAnswerText = cleanSentence;
      isCorrect = user_answer.trim() === cleanSentence.trim() ? 1 : 0;
    }

    // 4. Save answer to quiz_answers
    await c.env.DB.prepare(`
      INSERT INTO quiz_answers (session_id, vocab_id, user_answer, correct_answer, is_correct, time_taken_ms)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
      .bind(sessionId, vocab_id, user_answer, correctAnswerText, isCorrect, time_taken_ms || 0)
      .run();

    // 5. Update session's correct answers
    if (isCorrect === 1) {
      await c.env.DB.prepare(`
        UPDATE quiz_sessions SET correct_answers = correct_answers + 1 WHERE id = ?
      `).bind(sessionId).run();
    }

    // 6. Update user's SRS progress based on correct/incorrect
    // Map grading: Correct = 4 or 5 depending on speed, Incorrect = 1
    const quality = isCorrect === 1 ? (time_taken_ms < 5000 ? 5 : 4) : 1;

    // Check if progress already exists
    const progress = await c.env.DB.prepare(`
      SELECT ease_factor, interval_days, correct_count, wrong_count 
      FROM user_vocabulary_progress 
      WHERE user_id = ? AND vocab_id = ?
    `).bind(userId, vocab_id).first<{ ease_factor: number; interval_days: number; correct_count: number; wrong_count: number }>();

    let easeFactor = 2.5;
    let intervalDays = 1;
    let correctCount = 0;
    let wrongCount = 0;

    if (progress) {
      easeFactor = progress.ease_factor;
      intervalDays = progress.interval_days;
      correctCount = progress.correct_count;
      wrongCount = progress.wrong_count;
    }

    if (isCorrect === 1) correctCount++;
    else wrongCount++;

    const nextSrs = calculateNextReview(easeFactor, intervalDays, quality);

    let newStatus = 'learning';
    if (quality < 3) {
      newStatus = 'learning';
    } else if (nextSrs.interval >= 21) {
      newStatus = 'mastered';
    } else if (nextSrs.interval >= 7) {
      newStatus = 'review';
    }

    const nowStr = new Date().toISOString();

    if (progress) {
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

    // 7. Check if quiz is fully completed
    const answersRes = await c.env.DB.prepare(`
      SELECT COUNT(*) as count FROM quiz_answers WHERE session_id = ?
    `).bind(sessionId).first<{ count: number }>();

    const answersCount = answersRes?.count || 0;
    let isCompleted = false;

    if (answersCount >= session.total_questions) {
      isCompleted = true;
      // Calculate total duration (sum of question times)
      const durationRes = await c.env.DB.prepare(`
        SELECT SUM(time_taken_ms) as total_ms FROM quiz_answers WHERE session_id = ?
      `).bind(sessionId).first<{ total_ms: number }>();
      const totalDurationSecs = Math.round((durationRes?.total_ms || 0) / 1000);

      await c.env.DB.prepare(`
        UPDATE quiz_sessions 
        SET completed_at = datetime('now'), duration_seconds = ? 
        WHERE id = ?
      `).bind(totalDurationSecs, sessionId).run();
    }

    return c.json({
      isCorrect: isCorrect === 1,
      correctAnswer: correctAnswerText,
      quizCompleted: isCompleted,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error during answer submission' }, 500);
  }
});

// GET /api/quiz/:session_id/summary
quiz.get('/:session_id/summary', async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  const userId = payload.sub;
  const sessionId = parseInt(c.req.param('session_id'));

  try {
    const session = await c.env.DB.prepare(`
      SELECT * FROM quiz_sessions WHERE id = ? AND user_id = ?
    `).bind(sessionId, userId).first();

    if (!session) {
      return c.json({ error: 'Quiz session not found' }, 404);
    }

    const answers = await c.env.DB.prepare(`
      SELECT qa.*, v.chinese, v.pinyin, v.english, v.vietnamese
      FROM quiz_answers qa
      JOIN vocabulary v ON qa.vocab_id = v.id
      WHERE qa.session_id = ?
    `).bind(sessionId).all();

    return c.json({
      session,
      answers: answers.results,
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error' }, 500);
  }
});

export default quiz;
