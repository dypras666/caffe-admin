const fs = require('fs');
let code = fs.readFileSync('src/pages/PostsPage.jsx', 'utf8');

code = code.replace(
  /const handleSave = async \(e\) => \{\s*e\.preventDefault\(\);\s*setSaving\(true\);/,
  "const handleSave = async (e) => {\n    e.preventDefault();\n    if (saving) return;\n    setSaving(true);"
);

fs.writeFileSync('src/pages/PostsPage.jsx', code);
