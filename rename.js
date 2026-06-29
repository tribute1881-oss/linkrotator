const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace('например: линк бот минерва', 'например: линк бот атаман');
html = html.replace('link-rotator', 'Main Office');
fs.writeFileSync('public/index.html', html);
console.log('Готово!');
