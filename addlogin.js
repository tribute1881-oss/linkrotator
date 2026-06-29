const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

const loginHTML = `
<div id="login-screen" style="position:fixed;inset:0;background:#f8f8f7;display:flex;align-items:center;justify-content:center;z-index:9999">
  <div style="background:#fff;border:1px solid #e3e2dd;border-radius:12px;padding:32px;width:320px;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
    <div style="font-size:20px;font-weight:600;margin-bottom:6px;text-align:center">Main Office</div>
    <div style="font-size:13px;color:#898780;text-align:center;margin-bottom:24px">Панель управления ссылками</div>
    <div style="margin-bottom:12px">
      <label style="font-size:12px;font-weight:500;color:#52514e;display:block;margin-bottom:5px">Логин</label>
      <input id="login-user" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid #c8c7c2;background:#f8f8f7;font-size:13px;font-family:inherit;box-sizing:border-box" placeholder="admin" />
    </div>
    <div style="margin-bottom:20px">
      <label style="font-size:12px;font-weight:500;color:#52514e;display:block;margin-bottom:5px">Пароль</label>
      <input id="login-pass" type="password" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid #c8c7c2;background:#f8f8f7;font-size:13px;font-family:inherit;box-sizing:border-box" placeholder="••••••••" />
    </div>
    <div id="login-err" style="color:#e34948;font-size:12px;margin-bottom:12px;display:none;text-align:center"></div>
    <button onclick="doLogin()" style="width:100%;padding:9px;border-radius:8px;border:none;background:#0b0b0a;color:#fff;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">Войти</button>
  </div>
</div>
`;

const loginScript = `
let authToken = localStorage.getItem('auth_token') || '';

async function doLogin() {
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value.trim();
  if (!username || !password) return;
  try {
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({username, password})
    });
    const data = await r.json();
    if (data.token) {
      authToken = data.token;
      localStorage.setItem('auth_token', authToken);
      document.getElementById('login-screen').style.display = 'none';
      loadStats(30);
    } else {
      const err = document.getElementById('login-err');
      err.textContent = data.error || 'Ошибка входа';
      err.style.display = 'block';
    }
  } catch(e) {
    const err = document.getElementById('login-err');
    err.textContent = 'Ошибка соединения';
    err.style.display = 'block';
  }
}

async function checkAuth() {
  if (!authToken) { showLogin(); return; }
  const r = await fetch('/api/links', { headers: {'x-auth-token': authToken} });
  if (r.status === 401) { showLogin(); return; }
  document.getElementById('login-screen').style.display = 'none';
  loadStats(30);
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && document.getElementById('login-screen').style.display !== 'none') doLogin();
});
`;

// Добавляем форму входа в body
html = html.replace('<div class="app">', loginHTML + '<div class="app">');

// Добавляем токен ко всем fetch запросам к API
html = html.replace(/fetch\('\/api\//g, "fetch('/api/");
html = html.replace(
  /headers:\{'Content-Type':'application\/json'\}/g,
  "headers:{'Content-Type':'application/json','x-auth-token':authToken}"
);
html = html.replace(
  /method:'DELETE'\}/g,
  "method:'DELETE',headers:{'x-auth-token':authToken}}"
);
html = html.replace(
  /method:'PUT',headers:\{'Content-Type':'application\/json','x-auth-token':authToken\}/g,
  "method:'PUT',headers:{'Content-Type':'application/json','x-auth-token':authToken}"
);

// GET запросы тоже защищаем
html = html.replace(
  /await fetch\('\/api\/links'\)/g,
  "await fetch('/api/links', {headers:{'x-auth-token':authToken}})"
);
html = html.replace(
  /await fetch\('\/api\/stats\?days='\+days\)/g,
  "await fetch('/api/stats?days='+days, {headers:{'x-auth-token':authToken}})"
);

// Заменяем loadStats(30) в конце на checkAuth()
html = html.replace(/^loadStats\(30\);/m, 'checkAuth();');

// Добавляем скрипт авторизации
html = html.replace('<script>', '<script>\n' + loginScript);

fs.writeFileSync('public/index.html', html);
console.log('Done');
