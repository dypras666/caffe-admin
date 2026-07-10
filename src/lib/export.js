/**
 * Export utility — PDF dan Excel untuk semua halaman laporan
 */
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ─── EXCEL ────────────────────────────────────────────────────

/**
 * exportExcel(sheets, filename)
 * sheets: [{ name: 'Sheet1', columns: ['A','B'], rows: [[1,2],[3,4]] }]
 */
export function exportExcel(sheets, filename = 'laporan') {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const wsData = [sheet.columns, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Auto column widths
    const colWidths = sheet.columns.map((col, i) => {
      const maxLen = Math.max(
        col.length,
        ...sheet.rows.map(r => String(r[i] || '').length)
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ws['!cols'] = colWidths;

    // Style header row bold
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'F5E6D3' } } };
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

// ─── PDF ──────────────────────────────────────────────────────

/**
 * exportPDF(config)
 * config: {
 *   title, subtitle, period,
 *   tables: [{ title, columns: ['A','B'], rows: [[1,2]] }],
 *   filename
 * }
 */
export function exportPDF(config) {
  const { title, subtitle, period, tables = [], filename = 'laporan' } = config;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title || 'Laporan Café Azzura', pageW / 2, y, { align: 'center' });
  y += 8;

  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageW / 2, y, { align: 'center' });
    y += 6;
  }

  if (period) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Periode: ${period}`, pageW / 2, y, { align: 'center' });
    doc.setTextColor(0);
    y += 6;
  }

  // Print date
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, pageW - 10, y, { align: 'right' });
  doc.setTextColor(0);
  y += 4;

  // Tables
  for (const table of tables) {
    if (table.title) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(table.title, 10, y + 4);
      y += 8;
    }

    doc.autoTable({
      startY: y,
      head: [table.columns],
      body: table.rows,
      theme: 'striped',
      headStyles: {
        fillColor: [111, 78, 55], // cafe brown
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [255, 248, 231] }, // cafe light
      margin: { left: 10, right: 10 },
      didDrawPage: (data) => { y = data.cursor.y + 5; },
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  doc.save(`${filename}_${new Date().toISOString().slice(0,10)}.pdf`);
}

// ─── HELPERS ─────────────────────────────────────────────────

export function formatRpExport(v) {
  return `Rp ${Number(v || 0).toLocaleString('id')}`;
}

export function formatDateExport(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { dateStyle: 'medium' });
}

// ─── QUICK HELPERS per halaman ────────────────────────────────

export function exportOrdersPDF(orders, period) {
  exportPDF({
    title: 'Laporan Pesanan',
    subtitle: 'Café Azzura',
    period,
    filename: 'pesanan',
    tables: [{
      title: `${orders.length} Pesanan`,
      columns: ['No. Invoice', 'Pelanggan', 'Meja', 'Kasir', 'Tipe', 'Total', 'Status', 'Pembayaran', 'Waktu'],
      rows: orders.map(o => [
        o.order_number,
        o.customer_name || 'Umum',
        o.table_number || '-',
        o.served_by_name || '-',
        o.order_type,
        formatRpExport(o.total),
        o.order_status,
        o.payment_status,
        new Date(o.created_at).toLocaleString('id-ID'),
      ]),
    }],
  });
}

export function exportOrdersExcel(orders, period) {
  exportExcel([{
    name: 'Pesanan',
    columns: ['No. Invoice', 'Pelanggan', 'Meja', 'Kasir', 'Tipe', 'Subtotal', 'Pajak', 'Diskon', 'Total', 'Metode Bayar', 'Status Bayar', 'Status Order', 'Waktu'],
    rows: orders.map(o => [
      o.order_number,
      o.customer_name || 'Umum',
      o.table_number || '-',
      o.served_by_name || '-',
      o.order_type,
      Number(o.subtotal || 0),
      Number(o.tax || 0),
      Number(o.discount || 0),
      Number(o.total || 0),
      o.payment_method,
      o.payment_status,
      o.order_status,
      new Date(o.created_at).toLocaleString('id-ID'),
    ]),
  }], 'pesanan');
}

export function exportReportSummaryExcel(data, period) {
  const sheets = [];

  if (data.daily_data?.length) {
    sheets.push({
      name: 'Harian',
      columns: ['Tanggal', 'Transaksi', 'Revenue (Rp)'],
      rows: data.daily_data.map(d => [d.date, d.orders, Number(d.revenue)]),
    });
  }

  if (data.payment_breakdown?.length) {
    sheets.push({
      name: 'Metode Bayar',
      columns: ['Metode', 'Transaksi', 'Total (Rp)'],
      rows: data.payment_breakdown.map(p => [p.payment_method, p.cnt || p.count, Number(p.total)]),
    });
  }

  if (data.top_products?.length) {
    sheets.push({
      name: 'Top Produk',
      columns: ['Produk', 'Qty Terjual', 'Revenue (Rp)'],
      rows: data.top_products.map(p => [p.product_name, p.qty_sold, Number(p.revenue)]),
    });
  }

  exportExcel(sheets, `laporan_${period || 'hari-ini'}`);
}

export function exportProductsExcel(products, period) {
  exportExcel([{
    name: 'Produk',
    columns: ['Rank', 'Produk', 'Kategori', 'SKU', 'Qty Terjual', 'Revenue (Rp)', 'Harga Rata-rata', 'Jumlah Order'],
    rows: products.map((p, i) => [
      i + 1, p.product_name, p.category_name || '-', p.sku || '-',
      p.qty_sold, Number(p.revenue), Number(p.avg_price), p.order_count,
    ]),
  }], `produk_terjual_${period || ''}`);
}
