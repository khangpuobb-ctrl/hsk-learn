import { Hono } from 'hono';
import { Env } from '../index';
import { hashPassword, verifyPassword, generateToken } from '../lib/auth';

const auth = new Hono<{ Bindings: Env }>();

// Register
auth.post('/register', async (c) => {
  const { email, password, display_name, hsk_target_level } = await c.req.json();

  if (!email || !password || !display_name) {
    return c.json({ error: 'Email, password, and display name are required' }, 400);
  }

  // Check if user already exists
  try {
    const existingUser = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind(email.toLowerCase().trim())
      .first();

    if (existingUser) {
      return c.json({ error: 'Email is already registered' }, 400);
    }

    const userId = crypto.randomUUID();
    const hashedPassword = await hashPassword(password);
    const targetLevel = hsk_target_level || 1;

    await c.env.DB.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, hsk_target_level) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(userId, email.toLowerCase().trim(), hashedPassword, display_name.trim(), targetLevel)
      .run();

    const secret = c.env.JWT_SECRET || 'hsk_secret_key_default_123';
    const token = await generateToken(userId, email, secret);

    // Set cookie
    c.header('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);

    return c.json({
      success: true,
      token,
      user: {
        id: userId,
        email,
        display_name,
        hsk_target_level: targetLevel,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error during registration' }, 500);
  }
});

// Login
auth.post('/login', async (c) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  try {
    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash, display_name, hsk_target_level FROM users WHERE email = ?'
    )
      .bind(email.toLowerCase().trim())
      .first<{ id: string; email: string; password_hash: string; display_name: string; hsk_target_level: number }>();

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const secret = c.env.JWT_SECRET || 'hsk_secret_key_default_123';
    const token = await generateToken(user.id, user.email, secret);

    c.header('Set-Cookie', `token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`);

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        hsk_target_level: user.hsk_target_level,
      },
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error during login' }, 500);
  }
});

// Me (Get current profile)
auth.get('/me', async (c) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const user = await c.env.DB.prepare(
      'SELECT id, email, display_name, hsk_target_level, created_at FROM users WHERE id = ?'
    )
      .bind(payload.sub)
      .first();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({ user });
  } catch (err: any) {
    return c.json({ error: err.message || 'Database error' }, 500);
  }
});

// Logout
auth.post('/logout', async (c) => {
  c.header('Set-Cookie', 'token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  return c.json({ success: true });
});

export default auth;
