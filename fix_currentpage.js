const fs = require('fs');

const filePath = '/root/telegram-sms/src/web/routes/groups.js';
let content = fs.readFileSync(filePath, 'utf8');

// Pattern: res.render(..., { ... username: req.session.username })
// Replace with: res.render(..., { ... username: req.session.username, currentPage: 'groups' })

// Regex to find "username: req.session.username" and add currentPage after it if not present
content = content.replace(
  /username: req\.session\.username(?!,\s*currentPage)/g,
  'username: req.session.username, currentPage: "groups"'
);

fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Fixed currentPage in all res.render() calls');
