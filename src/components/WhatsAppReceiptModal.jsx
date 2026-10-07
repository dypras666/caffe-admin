import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useToast } from './ui/toast';
import {
  MessageCircle, Copy, Check, Send, Phone, ExternalLink, RefreshCw
} from 'lucide-react';
import { buildWhatsAppReceiptText, formatWhatsAppNumber, openWhatsAppShare } from '../lib/whatsapp';

export default function WhatsAppReceiptModal({
  open,
  onClose,
  order,
  items = [],
  shopName = '',
  address = '',
  phone = '',
  currency = 'Rp',
}) {
  const toast = useToast();
  const [targetPhone, setTargetPhone] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && order) {
      let initialPhone = order.customer_phone || order.phone || order.customerPhone || order.member?.phone || '';
      // If customer_name itself was entered as a phone number or contains phone number
      if (!initialPhone && order.customer_name) {
        const cleanedName = String(order.customer_name).replace(/[\s-]/g, '');
        if (/^(\+?62|08)[0-9]{7,13}$/.test(cleanedName)) {
          initialPhone = cleanedName;
        } else {
          const match = String(order.customer_name).match(/(?:08|\+?62)[0-9]{8,13}/);
          if (match) initialPhone = match[0];
        }
      }
      if (!initialPhone && order.notes) {
        const match = String(order.notes).match(/(?:08|\+?62)[0-9]{8,13}/);
        if (match) initialPhone = match[0];
      }
      setTargetPhone(initialPhone);

      const resolvedShop = shopName || order.shop_name || order.branch_name || sessionStorage.getItem('admin_cafe_name') || '';
      const host = window.location.origin;
      const publicUrl = order.order_number ? `${host}/receipt/${order.order_number}` : null;

      const buildMsg = (itemList) => {
        const generated = buildWhatsAppReceiptText({
          shop_name: resolvedShop,
          address,
          phone,
          currency,
          order,
          items: itemList || [],
          publicUrl,
        });
        setMessage(generated);
      };

      const needFetch = ((!items || items.length === 0) || !initialPhone) && order.id;
      if (needFetch) {
        import('../lib/api').then(({ default: api }) => {
          api.get(`/orders/${order.id}`)
            .then(res => {
              const fullOrder = res.data?.order || res.data || {};
              const fetchedPhone = fullOrder.customer_phone || fullOrder.phone || '';
              if (fetchedPhone) {
                setTargetPhone(prev => prev || fetchedPhone);
              }
              const fetchedItems = res.data?.items || fullOrder.items || items || [];
              buildMsg(fetchedItems);
            })
            .catch(() => buildMsg(items || []));
        });
      } else {
        buildMsg(items);
      }
    }
  }, [open, order, items, shopName, address, phone, currency]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success('Teks nota berhasil disalin ke clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Gagal menyalin teks');
    }
  };

  const handleSend = () => {
    const formatted = formatWhatsAppNumber(targetPhone);
    if (!targetPhone) {
      if (!confirm('Nomor WhatsApp belum diisi. Tetap buka WhatsApp untuk memilih kontak?')) {
        return;
      }
    }
    openWhatsAppShare({ phone: formatted, text: message });
    toast.success('Membuka WhatsApp…');
    if (onClose) onClose();
  };

  const handleResetMessage = () => {
    const host = window.location.origin;
    const publicUrl = order?.order_number ? `${host}/receipt/${order.order_number}` : null;
    const generated = buildWhatsAppReceiptText({
      shop_name: shopName,
      address,
      phone,
      currency,
      order,
      items,
      publicUrl,
    });
    setMessage(generated);
    toast.info('Pesan nota di-reset ke format default');
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border bg-background shadow-2xl">
        {/* Header with WhatsApp Emerald Styling */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white tracking-wide">
                Share Nota via WhatsApp
              </DialogTitle>
              <DialogDescription className="text-xs text-emerald-100 font-medium">
                Order #{order.order_number} · Total {currency} {Number(order.total || 0).toLocaleString('id-ID')}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Target Phone Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              Nomor WhatsApp Pelanggan
            </label>
            <div className="relative">
              <Input
                type="tel"
                placeholder="Contoh: 08123456789 atau 628123456789"
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                className="pl-3 h-10 font-medium text-sm focus-visible:ring-emerald-500"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Format nomor otomatis disesuaikan (misal 08xx → 628xx). Bisa dikosongkan jika ingin memilih kontak langsung di WhatsApp.
            </p>
          </div>

          {/* Message Preview & Edit */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Preview Pesan Nota (WhatsApp Markdown)
              </label>
              <button
                type="button"
                onClick={handleResetMessage}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                title="Kembalikan ke pesan default"
              >
                <RefreshCw className="w-3 h-3" /> Reset Teks
              </button>
            </div>
            <textarea
              rows={9}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border border-input bg-muted/30 p-3 text-xs font-mono leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="flex-1 h-10 gap-2 text-xs font-semibold"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin!' : 'Salin Pesan'}
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              className="flex-1 h-10 gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
            >
              <Send className="w-4 h-4" />
              Kirim via WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
