import React, { useState } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  CheckCircle2, Printer, Receipt, Utensils, Tag, MessageCircle,
  Plus, Loader2, SlidersHorizontal, ArrowRight, CornerDownLeft
} from 'lucide-react';
import api from '../lib/api';
import {
  smartPrint, buildReceiptHTML, buildKitchenHTML, buildLabelHTML
} from '../lib/printer';
import { useToast } from './ui/toast';

export default function OrderSuccessModal({
  open,
  onClose,
  order,
  autoPrinted = {},
  onOpenManualLabel,
  onOpenWhatsApp,
  fmt,
}) {
  const toast = useToast();
  const [printingReceipt, setPrintingReceipt] = useState(false);
  const [printingKitchen, setPrintingKitchen] = useState(false);
  const [printingLabel, setPrintingLabel] = useState(false);

  if (!order) return null;

  const handlePrintReceipt = async () => {
    setPrintingReceipt(true);
    try {
      const r = await api.get(`/printers/receipt/${order.id}`);
      await smartPrint(buildReceiptHTML(r.data.receipt, r.data.printer), r.data.printer, 'receipt', r.data.receipt);
      toast.success('Struk berhasil dicetak!');
    } catch (e) {
      toast.error('Gagal cetak struk: ' + (e.response?.data?.error || e.message));
    } finally {
      setPrintingReceipt(false);
    }
  };

  const handlePrintKitchen = async () => {
    setPrintingKitchen(true);
    try {
      const k = await api.get(`/printers/kitchen/${order.id}`);
      await smartPrint(buildKitchenHTML(k.data.ticket, k.data.printer), k.data.printer, 'kitchen', k.data.ticket);
      toast.success('Tiket dapur berhasil dicetak!');
    } catch (e) {
      toast.error('Gagal cetak dapur: ' + (e.response?.data?.error || e.message));
    } finally {
      setPrintingKitchen(false);
    }
  };

  const handlePrintLabelAll = async () => {
    setPrintingLabel(true);
    try {
      const l = await api.get(`/printers/label/${order.id}`);
      const lData = l.data.label_data || l.data.labelData;
      await smartPrint(buildLabelHTML(lData, l.data.printer), l.data.printer, 'label', lData);
      toast.success('Semua label cup berhasil dicetak!');
    } catch (e) {
      toast.error('Gagal cetak label: ' + (e.response?.data?.error || e.message));
    } finally {
      setPrintingLabel(false);
    }
  };

  const total = Number(order.total || order.total_amount || 0);
  const paid = Number(order.paid_amount || order.cashReceived || total);
  const change = Math.max(0, paid - total);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden text-foreground">
        {/* Top Header Card */}
        <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 p-6 text-white text-center relative">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <CheckCircle2 className="w-9 h-9 text-white" />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Transaksi Berhasil!</h3>
          <p className="text-emerald-100 text-xs font-mono mt-1">#{order.order_number}</p>
        </div>

        {/* Order Brief */}
        <div className="p-5 space-y-4">
          <div className="bg-muted/40 rounded-xl p-3.5 space-y-2 border text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tipe &amp; Pelanggan:</span>
              <span className="font-semibold capitalize">
                {order.order_type} &bull; {order.customer_name || 'Umum'}
              </span>
            </div>
            {order.table_number && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Meja:</span>
                <span className="font-semibold">{order.table_number}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-1 border-t border-dashed">
              <span className="text-muted-foreground">Total Belanja:</span>
              <span className="text-sm font-bold text-foreground">
                {fmt ? fmt(total) : `Rp ${total.toLocaleString('id')}`}
              </span>
            </div>
            {change > 0 && (
              <div className="flex justify-between items-center text-emerald-700 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded">
                <span>Kembalian:</span>
                <span>{fmt ? fmt(change) : `Rp ${change.toLocaleString('id')}`}</span>
              </div>
            )}
          </div>

          {/* Opsi Cetak Manual */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-0.5">
              <span>Cetak Ulang / Manual:</span>
              {autoPrinted.label && (
                <span className="text-[10px] text-emerald-600 font-normal flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Label otomatis telah dikirim
                </span>
              )}
            </div>

            {/* Row Tombol Label Manual */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-10 text-xs gap-1.5 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 text-indigo-700 font-medium"
                onClick={handlePrintLabelAll}
                disabled={printingLabel}
              >
                {printingLabel ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
                Cetak Semua Label
              </Button>
              <Button
                variant="outline"
                className="h-10 text-xs gap-1.5 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 text-indigo-700 font-medium"
                onClick={() => {
                  onClose();
                  if (onOpenManualLabel) onOpenManualLabel(order.id);
                }}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Pilih Item Label
              </Button>
            </div>

            {/* Row Struk & Dapur & WhatsApp */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <Button
                variant="outline"
                className="h-9 text-xs gap-1 px-1"
                onClick={handlePrintReceipt}
                disabled={printingReceipt}
              >
                {printingReceipt ? <Loader2 className="w-3 h-3 animate-spin" /> : <Receipt className="w-3 h-3" />}
                Struk
              </Button>
              <Button
                variant="outline"
                className="h-9 text-xs gap-1 px-1"
                onClick={handlePrintKitchen}
                disabled={printingKitchen}
              >
                {printingKitchen ? <Loader2 className="w-3 h-3 animate-spin" /> : <Utensils className="w-3 h-3" />}
                Dapur
              </Button>
              <Button
                variant="outline"
                className="h-9 text-xs gap-1 px-1 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 border-emerald-200"
                onClick={() => {
                  onClose();
                  if (onOpenWhatsApp) onOpenWhatsApp(order);
                }}
              >
                <MessageCircle className="w-3 h-3" />
                WhatsApp
              </Button>
            </div>
          </div>
        </div>

        {/* Footer: Transaksi Baru */}
        <div className="p-4 bg-muted/20 border-t flex items-center justify-end">
          <Button
            onClick={onClose}
            className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Transaksi Baru
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
