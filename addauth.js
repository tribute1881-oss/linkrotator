const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');

// Добавляем подключение auth.js после require('crypto')
s = s.replace(
  "const crypto = require('crypto');",
  "const crypto = require('crypto');\nconst { sessions, requireAuth, AUTH_USER, AUTH_PASS } = require('./auth');"
);

// Добавляем login/logout роуты после app.use(express.json())
const loginRoutes = `
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === AUTH_USER && password === AUTH_PASS) {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessions.add(token);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Неверный логин или пароль' });
  }
});
app.post('/api/logout', (req, res) => {
  const token = req.headers['x-auth-token'];
  sessions.delete(token);
  res.json({ ok: true });
});
`;

s = s.replace(
  "app.use(express.static",
  loginRoutes + "app.use(express.static"
);

// Защищаем маршруты
s = s.replace("app.post('/api/links', (req", "app.post('/api/links', requireAuth, (req");
s = s.replace("app.put('/api/links/:id', (req", "app.put('/api/links/:id', requireAuth, (req");
s = s.replace("app.delete('/api/links/:id', (req", "app.delete('/api/links/:id', requireAuth, (req");

fs.writeFileSync('server.js', s);
console.log('Done');
