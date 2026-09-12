const fs = require('fs');
const path = '/opt/caffe-registry/tenant-router.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(
  "res.setHeader('Cache-Control', 'public, max-age=31536000');",
  "if (filePath.endsWith('.html')) {\n      res.setHeader('Cache-Control', 'no-cache');\n    } else {\n      res.setHeader('Cache-Control', 'public, max-age=31536000');\n    }"
);
fs.writeFileSync(path, content);
