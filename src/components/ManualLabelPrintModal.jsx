import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Loader2, Printer, Tag, Check, Copy, AlertCircle, RefreshCw,
  Download, FileText, Eye, Layers, Settings2, Zap, FileDown
} from 'lucide-react';
import api from '../lib/api';
import { smartPrint, buildLabelHTML, getDevicePrinter, getCleanProductName } from '../lib/printer';
import {
  LABEL_PAPER_SIZES, getPaperSizeConfig,
  downloadLabelPDF, previewLabelPDF, generateLabelPDF
} from '../lib/labelPdf';
import { useToast } from './ui/toast';

export default function ManualLabelPrintModal({ open, onClose, orderId, onPrinted }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [data, setData] = useState(null);
  const [selectedItems, setSelectedItems] = useState({}); // { [idx]: true/false }
  const [copies, setCopies] = useState({}); // { [idx]: count }
  const [paperSize, setPaperSize] = useState(() => {
    return localStorage.getItem('cafe_label_paper_size') || '50x30';
  });

  useEffect(() => {
    if (open && orderId) {
      fetchLabelData();
    } else {
      setData(null);
      setSelectedItems({});
      setCopies({});
    }
  }, [open, orderId]);

  const fetchLabelData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/printers/label/${orderId}`);
      const lData = res.data.label_data || res.data.labelData;
      setData({
        printer: res.data.printer,
        labelData: lData,
      });
      // Default select all items
      const initialSel = {};
      const initialCopies = {};
      (lData.items || []).forEach((item, idx) => {
        initialSel[idx] = true;
        initialCopies[idx] = 1;
      });
      setSelectedItems(initialSel);
      setCopies(initialCopies);
    } catch (err) {
      toast.error('Gagal memuat data label: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPaper = (sizeId) => {
    setPaperSize(sizeId);
    localStorage.setItem('cafe_label_paper_size', sizeId);
  };

  const toggleSelect = (idx) => {
    setSelectedItems(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const selectAll = (val) => {
    const next = {};
    (data?.labelData?.items || []).forEach((_, idx) => {
      next[idx] = val;
    });
    setSelectedItems(next);
  };

  const updateCopies = (idx, delta) => {
    setCopies(prev => {
      const cur = prev[idx] || 1;
      const next = Math.max(1, Math.min(10, cur + delta));
      return { ...prev, [idx]: next };
    });
  };

  const buildFinalPayload = () => {
    if (!data?.labelData) return null;
    const allItems = data.labelData.items || [];
    const itemsToPrint = [];

    allItems.forEach((it, idx) => {
      if (selectedItems[idx]) {
        const count = copies[idx] || 1;
        for (let c = 0; c < count; c++) {
          itemsToPrint.push({
            ...it,
            label_number: itemsToPrint.length + 1,
          });
        }
      }
    });

    if (itemsToPrint.length === 0) return null;

    const totalSelected = itemsToPrint.length;
    const finalizedItems = itemsToPrint.map((it, i) => ({
      ...it,
      label_number: i + 1,
      label_total: totalSelected,
    }));

    return {
      ...data.labelData,
      items: finalizedItems,
      total_labels: totalSelected,
    };
  };

  const handleDownloadPDF = () => {
    const payload = buildFinalPayload();
    if (!payload) {
      toast.warning('Pilih minimal 1 item untuk dicetak');
      return;
    }
    setGeneratingPdf(true);
    try {
      const fname = downloadLabelPDF(payload, paperSize);
      toast.success(`PDF label berhasil diunduh (${payload.total_labels} label)`);
    } catch (e) {
      toast.error('Gagal membuat PDF: ' + e.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePreviewPDF = () => {
    const payload = buildFinalPayload();
    if (!payload) {
      toast.warning('Pilih minimal 1 item untuk dicetak');
      return;
    }
    setGeneratingPdf(true);
    try {
      previewLabelPDF(payload, paperSize);
      toast.success(`Preview PDF ${payload.total_labels} label dibuka di tab baru`);
    } catch (e) {
      toast.error('Gagal membuka preview PDF: ' + e.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDirectThermalPrint = async () => {
    const payload = buildFinalPayload();
    if (!payload) {
      toast.warning('Pilih minimal 1 item untuk dicetak');
      return;
    }
    setPrinting(true);
    try {
      const targetPrinter = getDevicePrinter('label') || data.printer;
      const html = buildLabelHTML(payload, {
        ...targetPrinter,
        paper_width: paperSize.startsWith('80') ? '80mm' : '58mm',
      });
      await smartPrint(html, targetPrinter, 'label', payload);

      toast.success(`${payload.total_labels} label dikirim ke printer thermal!`);
      if (onPrinted) onPrinted(payload);
      onClose();
    } catch (err) {
      toast.error('Gagal cetak thermal: ' + err.message);
    } finally {
      setPrinting(false);
    }
  };

  const items = data?.labelData?.items || [];
  const selectedCount = Object.values(selectedItems).filter(Boolean).length;
  const totalCopiesToPrint = items.reduce((acc, _, idx) => {
    return selectedItems[idx] ? acc + (copies[idx] || 1) : acc;
  }, 0);

  const activePaper = getPaperSizeConfig(paperSize);
  const previewItem = items.find((_, idx) => selectedItems[idx]) || items[0];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0 flex flex-col overflow-hidden max-h-[88dvh] text-foreground">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b bg-muted/20 shrink-0 m-0">
          <DialogTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Cetak Label Cup Manual
            </span>
            {data?.labelData?.order && (
              <Badge variant="outline" className="font-mono text-xs">
                #{data.labelData.order.order_number}
              </Badge>
            )}
          </DialogTitle>
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>
              Tipe Output: <strong className="text-foreground">Dokumen PDF / Pratinjau Cetak</strong>
            </span>
            {data?.labelData?.order?.customer_name && (
              <span>Pelanggan: <strong className="text-foreground">{data.labelData.order.customer_name}</strong></span>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Memuat data label pesanan...</p>
          </div>
        ) : !data ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Data pesanan tidak ditemukan atau belum ada item.
          </div>
        ) : (
          <DialogBody className="p-4 space-y-4">
            {/* ─── 1. PILIHAN JENIS KERTAS (PAPER SIZES) ─── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  Pilih Jenis Kertas / Ukuran Label:
                </span>
                <span className="text-[11px] font-normal text-muted-foreground">
                  Ukuran aktif: <strong className="text-primary">{activePaper.label}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LABEL_PAPER_SIZES.map(p => {
                  const isSelected = p.id === paperSize;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPaper(p.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30'
                          : 'border-border/60 hover:border-primary/40 bg-card hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-foreground">{p.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{p.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ─── 2. LIVE PREVIEW KERTAS / STIKER ─── */}
            {previewItem && (
              <div className="bg-muted/40 rounded-xl p-3 border space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold flex items-center gap-1">
                    <Eye className="w-3 h-3 text-primary" />
                    Pratinjau Tampilan Label ({activePaper.label})
                  </span>
                  <span className="text-[10px] italic">Sesuai skala kertas yang dipilih</span>
                </div>

                <div className="bg-white text-black rounded-lg p-3 border shadow-sm max-w-sm mx-auto font-mono text-[11px] leading-tight space-y-1">
                  <div className="flex justify-between items-center text-[9px] font-bold border-b pb-1">
                    <span className="truncate">{data.labelData.shop_name || 'Cafe'}</span>
                    <span className="uppercase">{data.labelData.order?.order_type || 'DINE-IN'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold pt-0.5">
                    <span>#{data.labelData.order?.order_number}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-muted/40 text-black border-black/30">
                      Cup {previewItem.unit_index || 1}/{previewItem.unit_total || items.length}
                    </Badge>
                  </div>
                  {data.labelData.order?.customer_name && (
                    <div className="text-[9px] text-neutral-600">
                      Cust: <strong>{data.labelData.order.customer_name}</strong>
                    </div>
                  )}
                  <div className="border-t border-dashed my-1"></div>
                  <div className="font-bold text-xs text-neutral-900">{getCleanProductName(previewItem.product_name, previewItem.variants, previewItem.addons)}</div>
                  {Array.isArray(previewItem.variants) && previewItem.variants.length > 0 && (
                    <div className="text-[9px] text-neutral-600">
                      {previewItem.variants.map(v => typeof v === 'object' ? (v.option_name || v.name) : v).filter(Boolean).join(', ')}
                    </div>
                  )}
                  {Array.isArray(previewItem.addons) && previewItem.addons.length > 0 && (
                    <div className="text-[9px] text-neutral-600">
                      + {previewItem.addons.map(a => typeof a === 'object' ? (a.addon_name || a.name) : a).filter(Boolean).join(', ')}
                    </div>
                  )}
                  {previewItem.notes && (
                    <div className="text-[9px] italic text-amber-800">
                      * {previewItem.notes}
                    </div>
                  )}
                  <div className="border-t border-neutral-300 pt-1 flex justify-between text-[8px] text-neutral-500 mt-1">
                    <span>{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{data.labelData.order?.served_by_name ? `Kasir: ${data.labelData.order.served_by_name}` : ''}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── 3. DAFTAR CUP / ITEM (CHECKBOX & COPIES) ─── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs pb-1 border-b">
                <span className="font-semibold text-foreground">
                  Pilih Cup yang Dicetak ({selectedCount}/{items.length} item &bull; {totalCopiesToPrint} label)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => selectAll(true)}
                    className="text-primary hover:underline font-medium"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-muted-foreground">&bull;</span>
                  <button
                    type="button"
                    onClick={() => selectAll(false)}
                    className="text-muted-foreground hover:underline"
                  >
                    Batal Semua
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {items.map((item, idx) => {
                  const isSelected = !!selectedItems[idx];
                  const copyCount = copies[idx] || 1;
                  const variantsStr = Array.isArray(item.variants)
                    ? item.variants.map(v => typeof v === 'object' ? (v.option_name || v.name) : v).filter(Boolean).join(', ')
                    : '';
                  const addonsStr = Array.isArray(item.addons)
                    ? item.addons.map(a => typeof a === 'object' ? (a.addon_name || a.name) : a).filter(Boolean).join(', ')
                    : '';

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleSelect(idx)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-primary/5 border-primary/40 shadow-sm ring-1 ring-primary/20'
                          : 'bg-muted/20 opacity-60 hover:opacity-90'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-primary pointer-events-none w-4 h-4"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-foreground truncate">{getCleanProductName(item.product_name, item.variants, item.addons)}</p>
                            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                              Cup {item.unit_index || (idx + 1)}/{item.unit_total || items.length}
                            </Badge>
                          </div>
                          {variantsStr && (
                            <p className="text-[11px] text-muted-foreground truncate">{variantsStr}</p>
                          )}
                          {addonsStr && (
                            <p className="text-[10px] text-primary truncate">+ {addonsStr}</p>
                          )}
                          {item.notes && (
                            <p className="text-[10px] text-amber-700 italic truncate">* {item.notes}</p>
                          )}
                        </div>
                      </div>

                      {/* Controls Jumlah Salinan */}
                      <div
                        className="flex items-center gap-1.5 shrink-0 bg-background border rounded-lg p-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => updateCopies(idx, -1)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-xs font-bold"
                          title="Kurangi salinan"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-xs font-semibold">{copyCount}x</span>
                        <button
                          type="button"
                          onClick={() => updateCopies(idx, 1)}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-xs font-bold"
                          title="Tambah salinan"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </DialogBody>
        )}

        {/* ─── FOOTER ACTIONS: 3 TOMBOL UTAMA (Unduh | Cetak PDF | Cetak Langsung) ─── */}
        <div className="p-3 sm:p-4 border-t bg-muted/20 shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <Button variant="outline" size="sm" onClick={onClose} disabled={generatingPdf || printing} className="shrink-0">
            Batal
          </Button>

          <div className="flex flex-wrap items-center gap-2 justify-end">
            {/* 1. Tombol Unduh PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={loading || generatingPdf || printing || totalCopiesToPrint === 0}
              className="gap-1.5 text-xs h-9 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-medium"
              title="Unduh berkas PDF sesuai ukuran kertas yang dipilih"
            >
              <FileDown className="w-3.5 h-3.5" />
              Unduh PDF
            </Button>

            {/* 2. Tombol Cetak PDF */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviewPDF}
              disabled={loading || generatingPdf || printing || totalCopiesToPrint === 0}
              className="gap-1.5 text-xs h-9 border-slate-300 hover:bg-slate-50 font-medium"
              title="Buka pratinjau dokumen PDF di browser untuk dicetak"
            >
              {generatingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-slate-700" />
              )}
              Cetak PDF
            </Button>

            {/* 3. Tombol Cetak Langsung */}
            <Button
              size="sm"
              onClick={handleDirectThermalPrint}
              disabled={loading || generatingPdf || printing || totalCopiesToPrint === 0}
              className="gap-1.5 text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-3.5 shadow-sm"
              title="Cetak langsung ke printer thermal / default sistem"
            >
              {printing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5" />
              )}
              Cetak Langsung ({totalCopiesToPrint})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
