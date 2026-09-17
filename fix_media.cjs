const fs = require('fs');
let content = fs.readFileSync('src/pages/MediaPage.jsx', 'utf8');

const missingCode = `  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload({ target: { files: e.dataTransfer.files } });
    }
  };

  const getShareUrl`;

content = content.replace("  const getShareUrl", missingCode);
fs.writeFileSync('src/pages/MediaPage.jsx', content);
