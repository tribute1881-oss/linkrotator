
const AUTH_USER = process.env.ADMIN_USER || 'admin888';
const AUTH_PASS = process.env.ADMIN_PASS || 'atmimpmr888';
const sessions = new Set();

function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (token && sessions.has(token)) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

module.exports = { sessions, requireAuth, AUTH_USER, AUTH_PASS };
