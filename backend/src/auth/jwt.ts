import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'modliq-local-secret';
const JWT_EXPIRES = '7d';

export function signJwt(payload: { userId: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

export function verifyJwt(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
  } catch {
    return null;
  }
}

export default { signJwt, verifyJwt };
