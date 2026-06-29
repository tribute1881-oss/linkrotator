const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
s = s.replace(
  "path.join(__dirname, 'data', 'links.db')",
  "process.env.DB_PATH || path.join(__dirname, 'data', 'links.db')"
);
// Создаём папку data если её нет
s = "const fs = require('fs');\nif (!fs.existsSync('data')) fs.mkdirSync('data');\n" + s.replace("const fs = require('fs');\n", '');
fs.writeFileSync('server.js', s);
console.log('Готово!');
