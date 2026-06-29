const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');

// Добавляем мобильные стили
const mobileStyles = `
@media(max-width:768px){
  .sidebar{transform:translateX(-100%);transition:transform .25s;width:240px;z-index:50}
  .sidebar.open{transform:translateX(0)}
  .main{margin-left:0!important}
  .stat-grid{grid-template-columns:repeat(2,1fr)}
  .two-col{grid-template-columns:1fr}
  .mobile-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:40}
  .mobile-overlay.open{display:block}
  .mobile-menu-btn{display:flex!important}
  .content{padding:12px}
  .topbar{padding:10px 12px}
  table.ltable th:nth-child(3),table.ltable td:nth-child(3){display:none}
}
@media(min-width:769px){
  .mobile-menu-btn{display:none!important}
  .mobile-overlay{display:none!important}
}
`;

// Добавляем кнопку меню в topbar
html = html.replace(
  '<div class="topbar">',
  '<div class="mobile-overlay" id="mob-overlay" onclick="toggleSidebar()"></div>\n<div class="topbar">'
);

html = html.replace(
  '<h1 id="page-title">Обзор</h1>',
  '<div style="display:flex;align-items:center;gap:10px"><button class="mobile-menu-btn icon-btn" onclick="toggleSidebar()" style="display:none;width:36px;height:36px"><i class="ti ti-menu-2" style="font-size:20px"></i></button><h1 id="page-title">Обзор</h1></div>'
);

// Добавляем функцию toggleSidebar
const sidebarScript = `
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.getElementById('mob-overlay').classList.toggle('open');
}
// Закрываем сайдбар при навигации на мобиле
const origNav = nav;
`;

html = html.replace('let currentPage=', sidebarScript + 'let currentPage=');

// Добавляем закрытие сайдбара при клике на пункт меню на мобиле
html = html.replace(
  "if(page==='links')loadLinks();",
  "if(window.innerWidth<=768){document.querySelector('.sidebar').classList.remove('open');document.getElementById('mob-overlay').classList.remove('open');}\nif(page==='links')loadLinks();"
);

// Добавляем мобильные стили
html = html.replace('</style>', mobileStyles + '</style>');

// Добавляем viewport мета тег если нет
if (!html.includes('viewport')) {
  html = html.replace('<head>', '<head>\n<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />');
}

fs.writeFileSync('public/index.html', html);
console.log('Done');
