const fs = require('fs');
const path = require('path');
const glob = require('glob');

const files = glob.sync('/Users/azzura/development/cafe-admin/src/pages/*.jsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  if (content.includes('alert(')) {
    console.log(`Processing ${file}`);
    
    // Replace alert('...selesai...') or alert('...berhasil...') with showToast.success
    content = content.replace(/alert\(([^)]*?(?:selesai|berhasil|Sukses)[^)]*)\)/gi, 'showToast.success($1)');
    // Replace all other alerts with showToast.error
    content = content.replace(/alert\(/g, 'showToast.error(');
    
    // Add import if not present
    if (!content.includes('showToast')) {
        // shouldn't happen since we just added it, but just in case
    }
    
    if (!content.includes("import { showToast }")) {
      // Find the last import line
      const importRegex = /^import\s+.*?;?\s*$/gm;
      let lastIndex = 0;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        lastIndex = importRegex.lastIndex;
      }
      
      const importStr = "\nimport { showToast } from '../components/ui/toast';";
      if (lastIndex > 0) {
        content = content.slice(0, lastIndex) + importStr + content.slice(lastIndex);
      } else {
        content = importStr + "\n" + content;
      }
    }
    
    fs.writeFileSync(file, content);
  }
});
console.log('Done');
