const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Sidebar.jsx', 'utf8');

const targetSection = `    items: [
      { to: '/posts',   icon: FileText, label: 'Post & Halaman', adminOnly: true },
      { to: '/media',   icon: Image,    label: 'Galeri Media',    adminOnly: true },
      { to: '/categories', icon: Tag,   label: 'Kategori',        adminOnly: true },
    ],`;
const fixedSection = `    items: [
      { to: '/posts',   icon: FileText, label: 'Post & Halaman', adminOnly: true },
      { to: '/media',   icon: Image,    label: 'Galeri Media',    adminOnly: true },
    ],`;

code = code.replace(targetSection, fixedSection);
fs.writeFileSync('src/components/layout/Sidebar.jsx', code);
