import { Hono } from 'hono';
import { Env } from '../index';

const lessons = new Hono<{ Bindings: Env }>();

interface LessonRow {
  id: number;
  title_zh: string;
  title_en: string;
  hsk_level: number;
  content_zh: string;
  content_pinyin: string;
  content_en: string;
  content_vi: string | null;
  audio_url: string | null;
  category: string | null;
  created_at: string;
}

// GET /api/lessons
lessons.get('/', async (c) => {
  const level = c.req.query('level');
  const category = c.req.query('category');
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = (page - 1) * limit;

  try {
    let query = `SELECT id, title_zh, title_en, hsk_level, category, created_at FROM lessons WHERE 1=1`;
    const params: any[] = [];

    if (level) {
      query += ` AND hsk_level = ?`;
      params.push(parseInt(level));
    }

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM lessons WHERE 1=1`;
    const countParams: any[] = [];
    if (level) {
      countQuery += ` AND hsk_level = ?`;
      countParams.push(parseInt(level));
    }
    if (category) {
      countQuery += ` AND category = ?`;
      countParams.push(category);
    }

    const totalRes = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>();
    const total = totalRes?.total || 0;

    query += ` ORDER BY id ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error' }, 500);
  }
});

// GET /api/lessons/:id
lessons.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));

  try {
    const lesson = await c.env.DB.prepare(
      `SELECT * FROM lessons WHERE id = ?`
    )
      .bind(id)
      .first<LessonRow>();

    if (!lesson) {
      return c.json({ error: 'Lesson not found' }, 404);
    }

    // Parse JSON contents safely
    const parseSafe = (str: string) => {
      try {
        return JSON.parse(str);
      } catch (e) {
        return [str]; // Fallback to single string array
      }
    };

    return c.json({
      lesson: {
        ...lesson,
        content_zh: parseSafe(lesson.content_zh),
        content_pinyin: parseSafe(lesson.content_pinyin),
        content_en: parseSafe(lesson.content_en),
        content_vi: lesson.content_vi ? parseSafe(lesson.content_vi) : [],
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error' }, 500);
  }
});

export default lessons;
