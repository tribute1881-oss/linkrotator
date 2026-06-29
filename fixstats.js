const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
const oldStats = `app.get('/api/stats', (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const totals = query('SELECT COUNT(*) as total_clicks, COUNT(DISTINCT ip_hash) as unique_clicks FROM clicks WHERE clicked_at >= ?', [since]);
  const linksCount = query('SELECT COUNT(*) as n FROM links');
  const activeCount = query('SELECT COUNT(*) as n FROM links WHERE enabled = 1');
  const chart = query('SELECT date(clicked_at) as day, COUNT(*) as total, COUNT(DISTINCT ip_hash) as unique FROM clicks WHERE clicked_at >= ? GROUP BY date(clicked_at) ORDER BY day ASC', [since]);
  const topLinks = query('SELECT l.name, l.slug, COUNT(c.id) as clicks FROM links l LEFT JOIN clicks c ON l.slug = c.slug AND c.clicked_at >= ? GROUP BY l.id ORDER BY clicks DESC LIMIT 5', [since]);
  res.json({ totals: { clicks: totals[0].total_clicks, unique: totals[0].unique_clicks, links: linksCount[0].n, active: activeCount[0].n }, chart, topLinks });
});`;
const newStats = `app.get('/api/stats', (req, res) => {
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
    console.error('Stats error:', e.message);
    res.status(500).json({ error: e.message });
  }
});`;
if (s.includes("app.get('/api/stats'")) {
  s = s.replace(oldStats, newStats);
  if (!s.includes("Stats error")) {
    const idx = s.indexOf("app.get('/api/stats'");
    const end = s.indexOf('\n});', idx) + 4;
    s = s.slice(0, idx) + newStats + s.slice(end);
  }
}
fs.writeFileSync('server.js', s);
console.log('Done');
