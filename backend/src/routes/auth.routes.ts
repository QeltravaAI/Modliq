import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from '../auth/jwt';
import prisma from '../lib/prisma';

const router = Router();

const DEMO_USER_ID = 'demo-user-static-backend';
const DEMO_EMAIL = 'demo@modliq.com';
const DEMO_PASSWORD = 'modliqdemo';

// Seed the demo user into the database on startup
(async () => {
  try {
    const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
      await prisma.user.create({
        data: {
          id: DEMO_USER_ID,
          email: DEMO_EMAIL,
          name: 'Demo User',
          password: passwordHash,
          isDemo: true,
        },
      });
      console.log('[auth] Demo user seeded into database.');
    } else {
      console.log('[auth] Demo user already exists in database.');
    }
  } catch (err) {
    console.error('[auth] Failed to seed demo user (DB may not be ready):', (err as any)?.message || err);
  }
})();

// In-memory fallback users if Prisma is unavailable
const memoryUsers = new Map<string, any>();
(async () => {
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  memoryUsers.set(DEMO_EMAIL, {
    id: DEMO_USER_ID,
    _id: DEMO_USER_ID,
    email: DEMO_EMAIL,
    name: 'Demo User',
    password: demoHash,
    isDemo: true,
  });
})();

async function findUser(email: string) {
  try {
    return await prisma.user.findUnique({ where: { email } });
  } catch {
    return memoryUsers.get(email) || null;
  }
}

async function findUserById(id: string) {
  try {
    return await prisma.user.findUnique({ where: { id } });
  } catch {
    for (const u of memoryUsers.values()) {
      if (u.id === id || u._id === id) return u;
    }
    return null;
  }
}

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const existing = await findUser(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let user: any;
    try {
      user = await prisma.user.create({
        data: { email, name, password: passwordHash, isDemo: false },
      });
    } catch {
      // Fallback: memory only (not persisted across restarts)
      user = { id: `mem-${Date.now()}`, email, name, isDemo: false };
      memoryUsers.set(email, { ...user, password: passwordHash });
    }

    const token = jwt.signJwt({ userId: user.id, email: user.email || '' });
    return res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUser(email);
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const userId = user.id || user._id;
    const token = jwt.signJwt({ userId, email: user.email || '' });
    return res.json({ token, user: { id: userId, email: user.email, name: user.name } });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }

    const token = authHeader.slice(7);
    const payload = jwt.verifyJwt(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    return res.json({ id: user.id || user._id, email: user.email, name: user.name });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Failed to load user' });
  }
});

export default router;
