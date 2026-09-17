const fs = require('fs');
let code = fs.readFileSync('src/pages/PaymentsPage.jsx', 'utf8');

if (!code.includes("import jsQR from 'jsqr';")) {
  code = code.replace("import { Plus, Save", "import jsQR from 'jsqr';\nimport { Plus, Save");
}

const searchStr = `
  const handleIconFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setIconPreview(ev.target.result);
    reader.readAsDataURL(file);
  };
`;

const replaceStr = `
  const handleIconFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setIconPreview(ev.target.result);
      if (form.code?.toLowerCase() === 'qris' || form.name?.toLowerCase().includes('qris')) {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, img.width, img.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            try {
              await api.put('/settings/bulk', { settings: { qris_string: code.data } });
              toast({ title: 'Berhasil', description: 'QRIS terdeteksi dan berhasil disimpan otomatis!' });
            } catch (err) {
              toast({ title: 'Error', description: 'Gagal menyimpan QRIS otomatis.', variant: 'destructive' });
            }
          }
        };
        img.src = ev.target.result;
      }
    };
    reader.readAsDataURL(file);
  };
`;

if (code.includes('const handleIconFile')) {
  code = code.replace(searchStr.trim(), replaceStr.trim());
}

fs.writeFileSync('src/pages/PaymentsPage.jsx', code);
