const fs = require('fs');
let s = fs.readFileSync('server.js', 'utf8');
s = s.replace('process.env.PORT || 3000', 'process.env.PORT || 8080');
fs.writeFileSync('server.js', s);
console.log('Done');
