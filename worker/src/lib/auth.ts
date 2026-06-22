import { sign, verify } from 'hono/jwt';

// Salting & SHA-256 password hashing
export async function hashPassword(password: string, salt?: string): Promise<string> {
  const enc = new TextEncoder();
  
  // Generate random salt if not provided
  const currentSalt = salt || Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
    
  const data = enc.encode(currentSalt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${currentSalt}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt] = parts;
  const hash = await hashPassword(password, salt);
  return hash === storedHash;
}

// Generate JWT token
export async function generateToken(userId: string, email: string, secret: string): Promise<string> {
  const payload = {
    sub: userId,
    email: email,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days expiration
  };
  return await sign(payload, secret);
}

// Verify JWT token and return payload
export async function verifyToken(token: string, secret: string) {
  try {
    return await verify(token, secret);
  } catch (e) {
    return null;
  }
}
