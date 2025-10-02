import { Router, Request, Response } from 'express';
import { executeQuery, executeStatement, generateId } from '../db/snowflake';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const router = Router();

// Role enum values
const Roles = { ADMIN: 'ADMIN', RESPONDENT: 'RESPONDENT' } as const;
const registerSchema = z.object({ email: z.string().email(), password: z.string().min(6), role: z.enum(['ADMIN', 'RESPONDENT']).optional() });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

router.post('/register', async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password, role } = parsed.data;
  try {
    const existing = await executeQuery('SELECT * FROM USERS WHERE EMAIL = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const userId = generateId();
    await executeStatement(
      'INSERT INTO USERS (ID, EMAIL, PASSWORD, ROLE) VALUES (?, ?, ?, ?)',
      [userId, email, hash, role ?? 'RESPONDENT']
    );
    const user = await executeQuery('SELECT * FROM USERS WHERE ID = ?', [userId]);
    const userData = user[0];
    const token = jwt.sign({ sub: userData.ID, role: userData.ROLE }, JWT_SECRET, { expiresIn: '12h' });
    res.status(201).json({ token, user: { id: userData.ID, email: userData.EMAIL, role: userData.ROLE } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { email, password } = parsed.data;
  const user = await executeQuery('SELECT * FROM USERS WHERE EMAIL = ?', [email]);
  if (user.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
  const userData = user[0];
  const ok = await bcrypt.compare(password, userData.PASSWORD);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ sub: userData.ID, role: userData.ROLE }, JWT_SECRET, { expiresIn: '12h' });
  res.json({ token, user: { id: userData.ID, email: userData.EMAIL, role: userData.ROLE } });
});

export const authMiddleware = (roles?: string[]) => {
  return (req: Request & { user?: any }, res: Response, next: Function) => {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: 'Missing auth' });
    const token = header.replace('Bearer ', '');
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (roles && !roles.includes(decoded.role)) return res.status(403).json({ error: 'Forbidden' });
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};
