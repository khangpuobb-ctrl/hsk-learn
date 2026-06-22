-- Từ vựng HSK
CREATE TABLE IF NOT EXISTS vocabulary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hsk_level INTEGER NOT NULL,          -- 1 đến 6
  chinese TEXT NOT NULL,               -- 汉字 (chữ Hán giản thể)
  traditional TEXT,                    -- 繁體字 (phồn thể, optional)
  pinyin TEXT NOT NULL,                -- Phiên âm có dấu: nǐ hǎo
  english TEXT NOT NULL,               -- Nghĩa tiếng Anh
  vietnamese TEXT,                     -- Nghĩa tiếng Việt (optional)
  part_of_speech TEXT,                 -- noun, verb, adj, adv...
  example_zh TEXT,                     -- Câu ví dụ tiếng Trung
  example_pinyin TEXT,                 -- Pinyin của câu ví dụ
  example_en TEXT,                     -- Dịch nghĩa câu ví dụ
  stroke_count INTEGER,                -- Số nét
  frequency_rank INTEGER               -- Thứ hạng tần suất xuất hiện
);

-- Bài đọc song ngữ
CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title_zh TEXT NOT NULL,
  title_en TEXT NOT NULL,
  hsk_level INTEGER NOT NULL,
  content_zh TEXT NOT NULL,            -- Nội dung tiếng Trung (JSON mảng câu hoặc chuỗi phân tách)
  content_pinyin TEXT NOT NULL,        -- Pinyin tương ứng
  content_en TEXT NOT NULL,            -- Bản dịch tiếng Anh
  content_vi TEXT,                     -- Bản dịch tiếng Việt
  audio_url TEXT,                      -- URL file audio (optional)
  category TEXT,                       -- 'daily', 'business', 'travel', 'culture'
  created_at TEXT DEFAULT (datetime('now'))
);

-- Người dùng
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                 -- UUID
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,         -- SHA-256 hash or similar (stored as hex or base64)
  display_name TEXT,
  hsk_target_level INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Tiến độ học từ vựng (SRS - Spaced Repetition)
CREATE TABLE IF NOT EXISTS user_vocabulary_progress (
  user_id TEXT NOT NULL,
  vocab_id INTEGER NOT NULL,
  status TEXT DEFAULT 'new',           -- 'new', 'learning', 'review', 'mastered'
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  ease_factor REAL DEFAULT 2.5,        -- SM-2 algorithm
  interval_days INTEGER DEFAULT 1,
  next_review TEXT DEFAULT (datetime('now')), -- ISO-8601 datetime string
  last_reviewed TEXT,
  PRIMARY KEY (user_id, vocab_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vocab_id) REFERENCES vocabulary(id) ON DELETE CASCADE
);

-- Lịch sử quiz
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  hsk_level INTEGER NOT NULL,
  quiz_type TEXT NOT NULL,             -- 'multiple_choice', 'listening', 'fill_blank', 'sentence_order'
  total_questions INTEGER,
  correct_answers INTEGER,
  duration_seconds INTEGER,
  completed_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Bài quiz chi tiết
CREATE TABLE IF NOT EXISTS quiz_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  vocab_id INTEGER NOT NULL,
  user_answer TEXT,
  correct_answer TEXT,
  is_correct INTEGER DEFAULT 0,       -- 0 hoặc 1
  time_taken_ms INTEGER,
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (vocab_id) REFERENCES vocabulary(id) ON DELETE CASCADE
);

-- Chỉ mục
CREATE INDEX IF NOT EXISTS idx_vocab_level ON vocabulary(hsk_level);
CREATE INDEX IF NOT EXISTS idx_progress_user ON user_vocabulary_progress(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_lessons_level ON lessons(hsk_level);
