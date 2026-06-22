import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import { verifyToken } from './lib/auth';
import authRouter from './routes/auth';
import vocabularyRouter from './routes/vocabulary';
import lessonsRouter from './routes/lessons';
import progressRouter from './routes/progress';
import quizRouter from './routes/quiz';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// 1. CORS Middleware Configuration
app.use('*', async (c, next) => {
  const corsMiddleware = cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://hsk-learn.pages.dev'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  return await corsMiddleware(c, next);
});

// Helper to parse cookies manually in case c.req.cookie() isn't fully available
function getCookie(cookieHeader: string, name: string): string | null {
  const nameEQ = name + '=';
  const ca = cookieHeader.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// 2. Custom Authentication Middleware
// Parses JWT from Bearer Authorization or Cookie token.
// If valid, sets c.set('jwtPayload', payload).
app.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const cookieHeader = c.req.header('Cookie') || '';
  
  let token = null;

  // Try Bearer Auth header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  // Try Cookie token
  if (!token && cookieHeader) {
    token = getCookie(cookieHeader, 'token');
  }

  if (token) {
    const secret = c.env.JWT_SECRET || 'hsk_secret_key_default_123';
    const payload = await verifyToken(token, secret);
    if (payload) {
      c.set('jwtPayload', payload);
    }
  }

  await next();
});

// Helper middleware to enforce auth on specific paths
const requireAuth = async (c: any, next: any) => {
  const payload = c.get('jwtPayload');
  if (!payload) {
    return c.json({ error: 'Unauthorized: Authentication required' }, 401);
  }
  await next();
};

// Protect progress and quiz endpoints
app.use('/api/progress/*', requireAuth);
app.use('/api/quiz/*', requireAuth);

// 3. Register route endpoints
app.route('/api/auth', authRouter);
app.route('/api/vocabulary', vocabularyRouter);
app.route('/api/lessons', lessonsRouter);
app.route('/api/progress', progressRouter);
app.route('/api/quiz', quizRouter);

// Base route
app.get('/', (c) => {
  return c.json({
    name: 'HSK Bilingual Learning Platform API',
    status: 'online',
    version: '1.0.0',
  });
});

export default app;
