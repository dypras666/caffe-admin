import { showToast } from "../components/ui/toast";
import jsPDF from 'jspdf';
import { getCleanProductName } from './printer';

export const LABEL_PAPER_SIZES = [
  { id: '50x30', label: '50 × 30 mm', name: 'Standar Cup', desc: 'Ukuran paling umum untuk cup minuman', width: 50, height: 30 },
  { id: '40x30', label: '40 × 30 mm', name: 'Mini Cup', desc: 'Untuk cup kecil / stiker topping', width: 40, height: 30 },
  { id: '50x40', label: '50 × 40 mm', name: 'Medium', desc: 'Ruang lebih lega untuk varian banyak', width: 50, height: 40 },
  { id: '58x40', label: '58 × 40 mm', name: 'Roll 58mm', desc: 'Kertas stiker printer thermal 58mm', width: 58, height: 40 },
  { id: '80x50', label: '80 × 50 mm', name: 'Roll 80mm', desc: 'Kertas stiker printer thermal 80mm', width: 80, height: 50 },
  { id: 'a4',    label: 'A4 (Grid Stiker)', name: 'Kertas A4 / HVS', desc: 'Lembar A4 berisi susunan label siap gunting', width: 210, height: 297, isGrid: true },
];

export function getPaperSizeConfig(sizeId) {
  return LABEL_PAPER_SIZES.find(s => s.id === sizeId) || LABEL_PAPER_SIZES[0];
}

/**
 * Generate a jsPDF document for cup/sticker labels
 * @param {Object} payload { shop_name, order, items: [...] }
 * @param {string} sizeId '50x30' | '40x30' | '50x40' | '58x40' | '80x50' | 'a4'
 * @returns {jsPDF}
 */
export function generateLabelPDF(payload, sizeId = '50x30') {
  const paper = getPaperSizeConfig(sizeId);
  const isA4 = paper.id === 'a4';

  const doc = new jsPDF({
    orientation: isA4 ? 'portrait' : (paper.width >= paper.height ? 'landscape' : 'portrait'),
    unit: 'mm',
    format: isA4 ? 'a4' : [paper.width, paper.height],
  });

  const items = payload.items || [];
  const orderNum = payload.order?.order_number || '-';
  const shopName = payload.shop_name || 'Cafe';
  const custName = payload.order?.customer_name || '';
  const orderType = (payload.order?.order_type || 'DINE-IN').toUpperCase();
  const table = payload.order?.table_name || payload.order?.table_number
    ? `Meja ${payload.order?.table_name || payload.order?.table_number}`
    : '';
  const servedBy = payload.order?.served_by_name ? `Kasir: ${payload.order.served_by_name}` : '';
  const dtStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' });

  if (isA4) {
    // ─── A4 GRID LAYOUT (2 columns x 6 rows = 12 stickers per A4 page) ─────
    const cols = 2;
    const rows = 6;
    const cardW = 90;
    const cardH = 40;
    const startX = 15;
    const startY = 15;
    const gapX = 10;
    const gapY = 5;

    let colIdx = 0;
    let rowIdx = 0;

    items.forEach((item, i) => {
      if (i > 0 && i % (cols * rows) === 0) {
        doc.addPage('a4', 'portrait');
        colIdx = 0;
        rowIdx = 0;
      }

      const x = startX + colIdx * (cardW + gapX);
      const y = startY + rowIdx * (cardH + gapY);

      // Border outline (dashed)
      doc.setDrawColor(180, 180, 180);
      doc.setLineDashPattern([1.5, 1.5], 0);
      doc.roundedRect(x, y, cardW, cardH, 2, 2, 'S');
      doc.setLineDashPattern([], 0);

      // Header row
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      const titleShort = shopName.length > 28 ? shopName.slice(0, 28) + '...' : shopName;
      doc.text(titleShort, x + 3, y + 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`${orderType}${table ? ` • ${table}` : ''}`, x + cardW - 3, y + 4.5, { align: 'right' });

      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.line(x + 3, y + 6.5, x + cardW - 3, y + 6.5);

      // Order number & cup indicator
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`#${orderNum}`, x + 3, y + 10.5);
      doc.text(`[${item.label_number || 1}/${item.label_total || 1}]`, x + cardW - 3, y + 10.5, { align: 'right' });

      if (custName) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(`Pelanggan: ${custName}`, x + 3, y + 14);
      }

      // Divider
      doc.setDrawColor(220, 220, 220);
      doc.line(x + 3, y + 15.5, x + cardW - 3, y + 15.5);

      // Product Name
      doc.setFont('helvetica', 'bold');
      const cleanName = getCleanProductName(item.product_name, item.variants, item.addons);
      const prodName = cleanName?.length > 32 ? cleanName.slice(0, 32) + '...' : cleanName;
      doc.text(prodName, x + 3, y + 19.5);

      // Variants / Addons / Notes
      let curY = y + 23.5;
      const variantsStr = Array.isArray(item.variants)
        ? item.variants.map(v => typeof v === 'object' ? (v.option_name || v.name) : v).filter(Boolean).join(', ')
        : '';
      if (variantsStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(variantsStr.slice(0, 48), x + 3, curY);
        curY += 3.5;
      }

      const addonsStr = Array.isArray(item.addons)
        ? item.addons.map(a => typeof a === 'object' ? (a.addon_name || a.name) : a).filter(Boolean).join(', ')
        : '';
      if (addonsStr) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.text(`+ ${addonsStr.slice(0, 48)}`, x + 3, curY);
        curY += 3.5;
      }

      if (item.notes) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.5);
        doc.text(`* ${item.notes.slice(0, 48)}`, x + 3, curY);
      }

      // Footer
      doc.setDrawColor(200, 200, 200);
      doc.line(x + 3, y + cardH - 4.5, x + cardW - 3, y + cardH - 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(dtStr, x + 3, y + cardH - 2);
      if (servedBy) {
        doc.text(servedBy, x + cardW - 3, y + cardH - 2, { align: 'right' });
      }

      colIdx++;
      if (colIdx >= cols) {
        colIdx = 0;
        rowIdx++;
      }
    });
  } else {
    // ─── SINGLE STICKER PER PAGE (Thermal sticker rolls: 50x30, 40x30, 50x40, etc) ───
    const w = paper.width;
    const h = paper.height;
    const isTiny = h <= 30 || w <= 45;

    items.forEach((item, i) => {
      if (i > 0) {
        doc.addPage([w, h], w >= h ? 'landscape' : 'portrait');
      }

      // Optional outer boundary guide (very light dashed line)
      doc.setDrawColor(220, 220, 220);
      doc.setLineDashPattern([0.5, 0.5], 0);
      doc.rect(0.5, 0.5, w - 1, h - 1);
      doc.setLineDashPattern([], 0);

      // Top row: Shop Name & Order Type
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isTiny ? 6.5 : 7.5);
      doc.setTextColor(20, 20, 20);
      const titleLen = isTiny ? 18 : 26;
      const title = shopName.length > titleLen ? shopName.slice(0, titleLen) + '...' : shopName;
      doc.text(title, 2, isTiny ? 3.5 : 4.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isTiny ? 6 : 7);
      doc.text(orderType, w - 2, isTiny ? 3.5 : 4.5, { align: 'right' });

      // Solid dividing line
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.25);
      doc.line(2, isTiny ? 5 : 6, w - 2, isTiny ? 5 : 6);

      // Order number & cup progress badge
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isTiny ? 7 : 8);
      doc.text(`#${orderNum}`, 2, isTiny ? 8.5 : 10);
      doc.text(`[${item.label_number || 1}/${item.label_total || 1}]`, w - 2, isTiny ? 8.5 : 10, { align: 'right' });

      let curY = isTiny ? 11.5 : 13.5;
      if (custName) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isTiny ? 5.5 : 6.5);
        const custText = `Cust: ${custName}${table ? ` • ${table}` : ''}`;
        const maxCust = isTiny ? 24 : 32;
        doc.text(custText.length > maxCust ? custText.slice(0, maxCust) + '...' : custText, 2, curY);
        curY += (isTiny ? 2.8 : 3.5);
      }

      // Divider before product
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.15);
      doc.line(2, curY - 0.5, w - 2, curY - 0.5);
      curY += (isTiny ? 2.5 : 3);

      // Product Name (Bold & prominent)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isTiny ? 7.5 : 9);
      const maxProd = isTiny ? 22 : 28;
      const cleanName = getCleanProductName(item.product_name, item.variants, item.addons);
      const prodName = cleanName?.length > maxProd ? cleanName.slice(0, maxProd) + '...' : cleanName;
      doc.text(prodName, 2, curY);
      curY += (isTiny ? 2.8 : 3.6);

      // Variants
      const variantsStr = Array.isArray(item.variants)
        ? item.variants.map(v => typeof v === 'object' ? (v.option_name || v.name) : v).filter(Boolean).join(', ')
        : '';
      if (variantsStr && curY < h - 4) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isTiny ? 5.5 : 6.5);
        const maxVar = isTiny ? 30 : 38;
        doc.text(variantsStr.slice(0, maxVar), 2, curY);
        curY += (isTiny ? 2.5 : 3.2);
      }

      // Addons
      const addonsStr = Array.isArray(item.addons)
        ? item.addons.map(a => typeof a === 'object' ? (a.addon_name || a.name) : a).filter(Boolean).join(', ')
        : '';
      if (addonsStr && curY < h - 4) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(isTiny ? 5 : 6);
        const maxAddon = isTiny ? 30 : 38;
        doc.text(`+ ${addonsStr.slice(0, maxAddon)}`, 2, curY);
        curY += (isTiny ? 2.5 : 3.2);
      }

      // Notes
      if (item.notes && curY < h - 3.5) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(isTiny ? 5 : 6);
        doc.text(`* ${item.notes.slice(0, 32)}`, 2, curY);
      }

      // Footer line
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.15);
      doc.line(2, h - 3.5, w - 2, h - 3.5);

      // Footer text: Time and cashier
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(isTiny ? 4.5 : 5.5);
      doc.text(dtStr, 2, h - 1.5);
      if (servedBy) {
        doc.text(servedBy, w - 2, h - 1.5, { align: 'right' });
      }
    });
  }

  return doc;
}

/**
 * Download the generated label as a PDF file
 */
export function downloadLabelPDF(payload, sizeId = '50x30', customFilename) {
  const doc = generateLabelPDF(payload, sizeId);
  const orderNum = payload.order?.order_number || 'order';
  const fname = customFilename || `label_${orderNum}_${sizeId}.pdf`;
  doc.save(fname);
  return fname;
}

/**
 * Open PDF in a new tab / window for previewing or browser printing
 */
export function previewLabelPDF(payload, sizeId = '50x30') {
  const doc = generateLabelPDF(payload, sizeId);
  const blob = doc.output('blob');
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (!win) {
    showToast.error('Popup diblokir oleh browser. Izinkan popup untuk melihat preview PDF.');
  }
  return url;
}

/**
 * Generate PDF blob URL for embedding or iframe
 */
export function getLabelPDFBlobURL(payload, sizeId = '50x30') {
  const doc = generateLabelPDF(payload, sizeId);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
