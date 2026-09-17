const fs = require('fs');

function patchFile(file, match, replacement) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(match, replacement);
  fs.writeFileSync(file, content);
}

patchFile('src/pages/BranchesPage.jsx', 
  /placeholder="http:\/\/localhost:5174 \(default dari settings\)"/g, 
  'placeholder="Otomatis (contoh: https://demo-cafe-baru.caffe.id)"');

console.log("Patched admin");
