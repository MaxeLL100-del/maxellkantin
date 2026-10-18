import crypto from 'node:crypto';
const mac = (d) => crypto.createHmac('sha256', process.env.ADMIN_SECRET || '').update(d).digest('base64url');
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
export const checkPassword = (p) => !!process.env.ADMIN_PASSWORD && typeof p === 'string' && same(hash(p), hash(process.env.ADMIN_PASSWORD));
export const issueToken = () => { const d = Buffer.from(JSON.stringify({ exp: Date.now() + 8 * 3600e3 })).toString('base64url'); return d + '.' + mac(d); };
export const isAdmin = (req) => {
  if (!process.env.ADMIN_SECRET) return false;
  const [d, s] = (req.headers.authorization || '').replace(/^Bearer /, '').split('.');
  if (!d || !s || !same(s, mac(d))) return false;
  try { return JSON.parse(Buffer.from(d, 'base64url')).exp > Date.now(); } catch { return false; }
};
