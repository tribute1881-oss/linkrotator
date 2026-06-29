const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
s = s.replace(
  "console.error('Stats error:', e.message);",
  "console.error('Stats error:', e.message, e.stack);"
);
fs.writeFileSync('server.js', s);
console.log('Done');
