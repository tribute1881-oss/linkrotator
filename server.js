const fs = require('fs');
if (!fs.existsSync('data')) fs.mkdirSync('data');

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

const app = express();
const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'links.db');

let db;

async function initDB() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  db.run(`CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    destination TEXT NOT NULL,
    enabled INTEGER DEFAULT 1,
    stub_text TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    clicked_at TEXT DEFAULT (datetime('now')),
    ip_hash TEXT DEFAULT '',
    user_agent TEXT DEFAULT ''
  )`);
  saveDB();
}

function saveDB() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function query(sql, params) {
  const stmt = db.prepare(sql);
  stmt.bind(params || []);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function run(sql, params) {
  db.run(sql, params || []);
  saveDB();
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/r/:slug', (req, res) => {
  const rows = query('SELECT * FROM links WHERE slug = ?', [req.params.slug]);
  if (!rows.length) return res.status(404).send('Ссылка не найдена');
  const link = rows[0];
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
  run('INSERT INTO clicks (slug, ip_hash, user_agent) VALUES (?, ?, ?)', [link.slug, ipHash, (req.headers['user-agent'] || '').slice(0, 200)]);
  if (!link.enabled) {
    return res.send('<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><div>' + (link.stub_text || 'Страница временно недоступна.') + '</div></body></html>');
  }
  res.redirect(302, link.destination);
});

app.get('/api/links', (req, res) => {
  const links = query(`SELECT l.*, 
    (SELECT COUNT(*) FROM clicks c WHERE c.slug = l.slug) as clicks_total,
    (SELECT COUNT(DISTINCT ip_hash) FROM clicks c WHERE c.slug = l.slug) as clicks_unique
    FROM links l ORDER BY l.id DESC`);
  res.json(links);
});

app.post('/api/links', (req, res) => {
  const { name, destination, slug, enabled = 1, stub_text = '' } = req.body;
  if (!name || !destination) return res.status(400).json({ error: 'name и destination обязательны' });
  const finalSlug = slug || Math.random().toString(36).slice(2, 8);
  try {
    run('INSERT INTO links (name, slug, destination, enabled, stub_text) VALUES (?, ?, ?, ?, ?)', [name, finalSlug, destination, enabled ? 1 : 0, stub_text]);
    const rows = query('SELECT * FROM links WHERE slug = ?', [finalSlug]);
    res.json(rows[0]);
  } catch(e) {
    res.status(400).json({ error: e.message.includes('UNIQUE') ? 'Такой адрес уже занят' : e.message });
  }
});

app.put('/api/links/:id', (req, res) => {
  const rows = query('SELECT * FROM links WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Не найдено' });
  const l = rows[0];
  const { name, destination, slug, enabled, stub_text } = req.body;
  try {
    run('UPDATE links SET name=?, destination=?, slug=?, enabled=?, stub_text=?, updated_at=datetime(?) WHERE id=?', [
      name ?? l.name, destination ?? l.destination, slug ?? l.slug,
      enabled !== undefined ? (enabled ? 1 : 0) : l.enabled,
      stub_text !== undefined ? stub_text : l.stub_text,
      'now', req.params.id
    ]);
    res.json(query('SELECT * FROM links WHERE id = ?', [req.params.id])[0]);
  } catch(e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/links/:id', (req, res) => {
  run('DELETE FROM links WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.get('/api/stats', (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const daysNum = days >= 9999 ? 36500 : days;
    const since = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString();
    const totals = query('SELECT COUNT(*) as total_clicks, COUNT(DISTINCT ip_hash) as unique_clicks FROM clicks WHERE clicked_at >= ?', [since]);
    const linksCount = query('SELECT COUNT(*) as n FROM links');
    const activeCount = query('SELECT COUNT(*) as n FROM links WHERE enabled = 1');
    const chart = query('SELECT date(clicked_at) as day, COUNT(*) as total, COUNT(DISTINCT ip_hash) as unique FROM clicks WHERE clicked_at >= ? GROUP BY date(clicked_at) ORDER BY day ASC', [since]);
    const topLinks = query('SELECT l.name, l.slug, COUNT(c.id) as clicks FROM links l LEFT JOIN clicks c ON l.slug = c.slug AND c.clicked_at >= ? GROUP BY l.id ORDER BY clicks DESC LIMIT 5', [since]);
    const t = totals[0] || {};
    res.json({ totals: { clicks: t.total_clicks || 0, unique: t.unique_clicks || 0, links: (linksCount[0] || {}).n || 0, active: (activeCount[0] || {}).n || 0 }, chart: chart || [], topLinks: topLinks || [] });
  } catch(e) {
    console.error('Stats error:', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB().then(() => {
  app.listen(PORT, () => console.log('Сервер запущен: http://localhost:' + PORT));
});
