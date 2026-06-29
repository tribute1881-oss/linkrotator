const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
s = "const fs = require('fs');\n" + s;
fs.writeFileSync('server.js', s);
console.log('Исправлено!');
