import { Hono } from 'hono';
import { Env } from '../index';

const vocabulary = new Hono<{ Bindings: Env }>();

// GET /api/vocabulary
vocabulary.get('/', async (c) => {
  const level = c.req.query('level');
  const search = c.req.query('search');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const payload = c.get('jwtPayload');
  const userId = payload ? payload.sub : null;

  try {
    let query = `
      SELECT v.*, p.status, p.correct_count, p.wrong_count, p.next_review
      FROM vocabulary v
      LEFT JOIN user_vocabulary_progress p ON v.id = p.vocab_id AND p.user_id = ?
      WHERE 1=1
    `;
    const params: any[] = [userId];

    if (level) {
      query += ` AND v.hsk_level = ?`;
      params.push(parseInt(level));
    }

    if (search) {
      query += ` AND (v.chinese LIKE ? OR v.pinyin LIKE ? OR v.english LIKE ? OR v.vietnamese LIKE ?)`;
      const searchWildcard = `%${search}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM vocabulary v WHERE 1=1`;
    const countParams: any[] = [];
    if (level) {
      countQuery += ` AND v.hsk_level = ?`;
      countParams.push(parseInt(level));
    }
    if (search) {
      countQuery += ` AND (v.chinese LIKE ? OR v.pinyin LIKE ? OR v.english LIKE ? OR v.vietnamese LIKE ?)`;
      const searchWildcard = `%${search}%`;
      countParams.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }

    const totalRes = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>();
    const total = totalRes?.total || 0;

    // Get paginated items
    query += ` ORDER BY v.id ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error' }, 500);
  }
});

// GET /api/vocabulary/random
vocabulary.get('/random', async (c) => {
  const level = parseInt(c.req.query('level') || '1');
  const count = parseInt(c.req.query('count') || '10');
  const excludeMastered = c.req.query('exclude_mastered') !== 'false';

  const payload = c.get('jwtPayload');
  const userId = payload ? payload.sub : null;

  try {
    let query = `
      SELECT v.*, p.status, p.correct_count, p.wrong_count, p.next_review
      FROM vocabulary v
      LEFT JOIN user_vocabulary_progress p ON v.id = p.vocab_id AND p.user_id = ?
      WHERE v.hsk_level = ?
    `;
    const params: any[] = [userId, level];

    if (userId && excludeMastered) {
      query += ` AND (p.status IS NULL OR p.status != 'mastered')`;
    }

    query += ` ORDER BY RANDOM() LIMIT ?`;
    params.push(count);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ results });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error' }, 500);
  }
});

// GET /api/vocabulary/:id
vocabulary.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const payload = c.get('jwtPayload');
  const userId = payload ? payload.sub : null;

  try {
    const word = await c.env.DB.prepare(`
      SELECT v.*, p.status, p.correct_count, p.wrong_count, p.ease_factor, p.interval_days, p.next_review, p.last_reviewed
      FROM vocabulary v
      LEFT JOIN user_vocabulary_progress p ON v.id = p.vocab_id AND p.user_id = ?
      WHERE v.id = ?
    `)
      .bind(userId, id)
      .first();

    if (!word) {
      return c.json({ error: 'Vocabulary not found' }, 404);
    }

    return c.json({ word });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error' }, 500);
  }
});

export default vocabulary;
