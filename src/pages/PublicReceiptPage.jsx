import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Printer, MessageCircle, CheckCircle2, Clock,
  ArrowLeft, Coffee, Store, ShieldCheck, Share2
} from 'lucide-react';
import { openWhatsAppShare, buildWhatsAppReceiptText } from '../lib/whatsapp';

export default function PublicReceiptPage() {
  const { orderNumber } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderNumber) return;
    setLoading(true);
    api.get(`/orders/public/${orderNumber}`)
      .then(res => setData(res.data))
      .catch(err => {
        setError(err.response?.data?.error || 'Gagal memuat nota pesanan');
      })
      .finally(() => setLoading(false));
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Memuat nota pesanan…</p>
      </div>
    );
  }

  if (error || !data?.order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 border text-center shadow-sm">
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-2">Nota Tidak Ditemukan</h2>
          <p className="text-sm text-muted-foreground mb-6">
            {error || 'Nomor order tidak valid atau telah dihapus.'}
          </p>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { order, items, shop } = data;
  const currency = shop?.currency || 'Rp';
  const fmt = (v) => `${currency} ${Number(v || 0).toLocaleString('id-ID')}`;
  const isPaid = order.payment_status === 'paid';

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const text = buildWhatsAppReceiptText({
      shop_name: shop.name,
      address: shop.address,
      phone: shop.phone,
      currency,
      order,
      items,
      publicUrl: window.location.href,
    });
    openWhatsAppShare({ text });
  };

  return (
    <div className="min-h-screen bg-slate-100/70 py-8 px-4 flex flex-col items-center justify-center font-sans antialiased text-foreground">
      {/* Action Buttons Top (Hidden in Print) */}
      <div className="max-w-md w-full mb-4 flex items-center justify-between print:hidden">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" /> Nota Resmi Digital
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            className="h-8 text-xs gap-1.5 bg-white shadow-sm hover:bg-slate-50"
          >
            <Printer className="w-3.5 h-3.5" /> Cetak
          </Button>
          <Button
            size="sm"
            onClick={handleShare}
            className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
          >
            <MessageCircle className="w-3.5 h-3.5" /> Share WA
          </Button>
        </div>
      </div>

      {/* Main Digital Receipt Card */}
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden print:shadow-none print:border-none print:m-0 print:w-full">
        {/* Header Section */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white p-6 text-center relative">
          <div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-md mb-3 shadow-inner">
            <Coffee className="w-7 h-7 text-amber-300" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">{shop?.name || ''}</h1>
          {shop.address && <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">{shop.address}</p>}
          {shop.phone && <p className="text-[11px] text-slate-400 mt-0.5">Tel: {shop.phone}</p>}

          <div className="mt-4 pt-3 border-t border-white/10 flex justify-center">
            {isPaid ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1 gap-1.5 shadow-sm">
                <CheckCircle2 className="w-3.5 h-3.5" /> Pembayaran Lunas
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-400 text-amber-300 text-xs px-3 py-1 gap-1.5 bg-amber-400/10">
                <Clock className="w-3.5 h-3.5" /> Menunggu Pembayaran
              </Badge>
            )}
          </div>
        </div>

        {/* Order Meta */}
        <div className="p-6 space-y-4">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Nomor Order</span>
              <span className="font-bold text-sm font-mono tracking-tight text-slate-900">#{order.order_number}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Waktu Transaksi</span>
              <span className="font-medium text-slate-800">
                {new Date(order.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Tipe Layanan</span>
              <span className="font-semibold uppercase text-slate-800">
                {order.order_type} {order.table_name || order.table_number ? `(Meja ${order.table_name || order.table_number})` : ''}
              </span>
            </div>
            {order.customer_name && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Pelanggan</span>
                <span className="font-semibold text-slate-900">{order.customer_name}</span>
              </div>
            )}
            {order.served_by_name && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Kasir</span>
                <span className="font-medium text-slate-700">{order.served_by_name}</span>
              </div>
            )}
          </div>

          {/* Items Breakdown */}
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
              Rincian Menu ({items.reduce((s, i) => s + (i.quantity || 1), 0)} item)
            </div>
            <div className="space-y-3 divide-y divide-slate-100">
              {items.map((it, idx) => {
                const variants = it.variants_selected
                  ? (typeof it.variants_selected === 'string' ? JSON.parse(it.variants_selected) : it.variants_selected)
                  : [];
                const addons = it.addons_selected
                  ? (typeof it.addons_selected === 'string' ? JSON.parse(it.addons_selected) : it.addons_selected)
                  : [];

                return (
                  <div key={it.id || idx} className={`pt-2.5 ${idx === 0 ? 'pt-0' : ''}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                            {it.quantity}x
                          </span>
                          <span className="font-bold text-sm text-slate-800 leading-snug">
                            {(variants.length > 0 || addons.length > 0)
                              ? it.product_name.replace(/\s*\([^)]*\)$/, '').trim() || it.product_name
                              : it.product_name}
                          </span>
                        </div>
                        {variants.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5 pl-7">
                            {variants.map(v => v.option_name || v.name).filter(Boolean).join(', ')}
                          </p>
                        )}
                        {addons.length > 0 && (
                          <p className="text-xs text-slate-500 mt-0.5 pl-7">
                            + {addons.map(a => `${a.addon_name || a.name}${a.qty > 1 ? ` x${a.qty}` : ''}`).join(', ')}
                          </p>
                        )}
                        {it.notes && (
                          <p className="text-[11px] text-amber-600 italic mt-0.5 pl-7">
                            * {it.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-sm font-bold text-slate-900 shrink-0">
                        {fmt(it.subtotal || (it.unit_price * it.quantity))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals Section */}
          <div className="border-t border-dashed border-slate-300 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">{fmt(order.subtotal || order.total)}</span>
            </div>
            {Number(order.discount) > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>Diskon</span>
                <span>− {fmt(order.discount)}</span>
              </div>
            )}
            {Number(order.tax) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Pajak</span>
                <span className="font-medium text-slate-900">{fmt(order.tax)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-3 flex justify-between items-baseline">
              <span className="text-base font-black text-slate-900">Total Pembayaran</span>
              <span className="text-xl font-black text-emerald-600 tracking-tight">{fmt(order.total)}</span>
            </div>

            {/* Payment Info */}
            <div className="bg-slate-50 rounded-xl p-3 mt-3 border text-slate-700 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Metode Pembayaran</span>
                <span className="font-bold capitalize text-slate-900">{order.payment_method || '-'}</span>
              </div>
              {Number(order.paid_amount) > 0 && order.payment_method === 'cash' && (
                <>
                  <div className="flex justify-between">
                    <span>Tunai Diterima</span>
                    <span className="font-medium text-slate-900">{fmt(order.paid_amount)}</span>
                  </div>
                  {Number(order.change_amount) >= 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Kembalian</span>
                      <span>{fmt(order.change_amount)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-4 pb-2 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-700">Terima kasih atas kunjungan Anda!</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Simpan halaman ini sebagai bukti transaksi resmi Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
