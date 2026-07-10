/**
 * DevicePrinterSettings
 *
 * Per-device printer config stored in localStorage.
 * Independent of site-wide printer settings — each browser/device
 * can have its own receipt and kitchen printer.
 *
 * Supports: Network/IP, Browser (window.print), Bluetooth (Web Bluetooth API), USB (Web USB API)
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Badge } from './ui/badge';
import {
  Printer, Bluetooth, Wifi, Usb, Monitor, Trash2,
  Search, CheckCircle2, AlertCircle, Loader2, Settings,
} from 'lucide-react';
import {
  getDevicePrinter, setDevicePrinter, removeDevicePrinter,
  scanBluetoothPrinters, scanUSBPrinters,
  smartPrint, buildReceiptHTML,
} from '../lib/printer';

const TYPES = [
  { key: 'receipt', label: 'Struk' },
  { key: 'kitchen', label: 'Dapur' },
];

const CONN_OPTIONS = [
  { value: 'browser',   label: 'Browser (window.print)',  icon: Monitor,   desc: 'Print dialog bawaan browser' },
  { value: 'network',   label: 'Network / IP',            icon: Wifi,      desc: 'Printer di jaringan lokal via IP' },
  { value: 'bluetooth', label: 'Bluetooth',               icon: Bluetooth, desc: 'Web Bluetooth API (Chrome/Edge)' },
  { value: 'usb',       label: 'USB',                     icon: Usb,       desc: 'Web USB API (Chrome/Edge)' },
];

const PAPER_OPTIONS = ['58mm', '80mm', 'dotmatrix', 'A4'];

const EMPTY_FORM = {
  name: '',
  connection: 'browser',
  ip: '',
  port: '9100',
  paper_width: '80mm',
  char_per_line: '42',
};

function printerFromForm(form) {
  return {
    ...form,
    port: parseInt(form.port) || 9100,
    char_per_line: parseInt(form.char_per_line) || 42,
  };
}

function formFromPrinter(p) {
  return {
    name: p.name || '',
    connection: p.connection || 'browser',
    ip: p.ip || '',
    port: String(p.port || 9100),
    paper_width: p.paper_width || '80mm',
    char_per_line: String(p.char_per_line || 42),
  };
}

// ─── Per-type config card ─────────────────────────────────────
function PrinterTypeCard({ type, label, onConfigure }) {
  const [printer, setPrinter] = useState(() => getDevicePrinter(type));

  const refresh = () => setPrinter(getDevicePrinter(type));

  const remove = () => {
    removeDevicePrinter(type);
    setPrinter(null);
  };

  const conn = CONN_OPTIONS.find(c => c.value === printer?.connection);
  const ConnIcon = conn?.icon || Monitor;

  return (
    <div className="border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Printer className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">Printer {label}</span>
        </div>
        {printer ? (
          <Badge variant="success" className="text-xs gap-1">
            <CheckCircle2 className="w-3 h-3" />Terkonfigurasi
          </Badge>
        ) : (
          <Badge variant="outline" className="text-xs gap-1">
            <AlertCircle className="w-3 h-3" />Belum diatur
          </Badge>
        )}
      </div>

      {printer ? (
        <div className="bg-muted/40 rounded-lg px-3 py-2 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 font-medium">
            <ConnIcon className="w-3.5 h-3.5" />
            {printer.name || conn?.label}
          </div>
          <div className="text-muted-foreground flex gap-3 flex-wrap">
            <span>{conn?.label}</span>
            {printer.ip && <span>IP: {printer.ip}:{printer.port}</span>}
            <span>Kertas: {printer.paper_width}</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Printer ini akan menggunakan pengaturan site default jika belum dikonfigurasi.
        </p>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 gap-1.5 text-xs h-8"
          onClick={() => onConfigure(type, printer, refresh)}>
          <Settings className="w-3.5 h-3.5" />
          {printer ? 'Ubah' : 'Konfigurasi'}
        </Button>
        {printer && (
          <Button size="sm" variant="ghost" className="text-xs h-8 px-2 text-destructive hover:bg-destructive/10"
            onClick={remove}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Configure dialog ─────────────────────────────────────────
function ConfigureDialog({ type, label, existing, onSave, onClose }) {
  const [form, setForm] = useState(existing ? formFromPrinter(existing) : EMPTY_FORM);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleScan = async () => {
    setScanError('');
    setScanning(true);
    try {
      let found;
      if (form.connection === 'bluetooth') {
        found = await scanBluetoothPrinters();
      } else if (form.connection === 'usb') {
        found = await scanUSBPrinters();
      }
      if (found) {
        setForm(f => ({
          ...f,
          name: found.name,
          paper_width: found.paper_width || f.paper_width,
          char_per_line: String(found.char_per_line || f.char_per_line),
          ...(found.bluetooth_device_id ? { bluetooth_device_id: found.bluetooth_device_id } : {}),
          ...(found.usb_vendor_id ? { usb_vendor_id: found.usb_vendor_id, usb_product_id: found.usb_product_id } : {}),
        }));
      }
    } catch (e) {
      setScanError(e.message);
    } finally {
      setScanning(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const printer = printerFromForm(form);
      const testHtml = buildReceiptHTML({
        shop_name: 'TEST PRINT',
        address: 'Device Printer Test',
        phone: '',
        currency: 'Rp',
        order: {
          order_number: 'TEST-001',
          order_type: 'dine-in',
          table_number: '1',
          customer_name: 'Test',
          created_at: new Date().toISOString(),
          subtotal: 25000,
          tax: 0,
          discount: 0,
          total: 25000,
          payment_method: 'cash',
        },
        items: [{ product_name: 'Test Item', quantity: 1, unit_price: 25000, subtotal: 25000 }],
      }, printer);
      await smartPrint(testHtml, null, type);
      setTestResult('ok');
    } catch (e) {
      setTestResult(e.message);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const config = printerFromForm(form);
    setDevicePrinter(type, config);
    onSave();
    onClose();
  };

  const connOpt = CONN_OPTIONS.find(c => c.value === form.connection);
  const ConnIcon = connOpt?.icon || Monitor;
  const canScan = form.connection === 'bluetooth' || form.connection === 'usb';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-4 h-4" />
            Konfigurasi Printer {label}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Tersimpan di browser ini saja — tidak mempengaruhi perangkat lain.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Printer</label>
            <Input value={form.name} onChange={e => upd('name', e.target.value)}
              placeholder="Contoh: Kasir 1 - Epson TM-T82" className="h-9" />
          </div>

          {/* Connection type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tipe Koneksi</label>
            <div className="grid grid-cols-2 gap-2">
              {CONN_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const sel = form.connection === opt.value;
                return (
                  <button key={opt.value} type="button"
                    onClick={() => upd('connection', opt.value)}
                    className={`flex items-start gap-2 p-2.5 rounded-lg border text-left transition-all ${
                      sel ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                    }`}>
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${sel ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-xs font-medium leading-tight">{opt.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scan button for BT/USB */}
          {canScan && (
            <div className="space-y-1.5">
              <Button type="button" variant="outline" size="sm" className="w-full gap-2 h-9"
                onClick={handleScan} disabled={scanning}>
                {scanning
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Search className="w-4 h-4" />}
                {scanning ? 'Mencari printer...' : `Scan ${form.connection === 'bluetooth' ? 'Bluetooth' : 'USB'} Printer`}
              </Button>
              {scanError && (
                <div className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {scanError}
                </div>
              )}
              {form.connection === 'bluetooth' && (
                <p className="text-[10px] text-muted-foreground">
                  Membutuhkan Chrome/Edge. Pastikan Bluetooth aktif di perangkat.
                </p>
              )}
              {form.connection === 'usb' && (
                <p className="text-[10px] text-muted-foreground">
                  Membutuhkan Chrome/Edge dengan izin USB. Colokkan printer terlebih dahulu.
                </p>
              )}
            </div>
          )}

          {/* Network IP input */}
          {form.connection === 'network' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">IP Address *</label>
                <Input value={form.ip} onChange={e => upd('ip', e.target.value)}
                  placeholder="192.168.1.100" className="h-9 font-mono text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Port</label>
                <Input value={form.port} onChange={e => upd('port', e.target.value)}
                  placeholder="9100" className="h-9 font-mono text-sm" />
              </div>
            </div>
          )}

          {/* Paper & char settings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ukuran Kertas</label>
              <Select value={form.paper_width} onValueChange={v => {
                const map = { '58mm': '32', '80mm': '42', 'dotmatrix': '80', 'A4': '80' };
                upd('paper_width', v);
                upd('char_per_line', map[v] || '42');
              }}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAPER_OPTIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Char/Baris</label>
              <Input value={form.char_per_line} onChange={e => upd('char_per_line', e.target.value)}
                type="number" min={20} max={120} className="h-9" />
            </div>
          </div>

          {/* Test print */}
          {testResult && (
            <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${
              testResult === 'ok'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResult === 'ok'
                ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              {testResult === 'ok' ? 'Test print berhasil!' : testResult}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" className="gap-1.5 h-9"
              onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              Test Print
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="h-9">Batal</Button>
            <Button type="button" onClick={handleSave} className="flex-1 h-9">Simpan</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main exported component ──────────────────────────────────
export default function DevicePrinterSettings({ trigger }) {
  const [open, setOpen] = useState(false);
  const [configuring, setConfiguring] = useState(null); // { type, existing, label, onRefresh }

  const handleConfigure = (type, existing, onRefresh) => {
    const label = TYPES.find(t => t.key === type)?.label || type;
    setConfiguring({ type, existing, label, onRefresh });
  };

  return (
    <>
      {trigger
        ? <span onClick={() => setOpen(true)}>{trigger}</span>
        : (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Printer className="w-3.5 h-3.5" />
            Printer Perangkat Ini
          </Button>
        )
      }

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Pengaturan Printer — Perangkat Ini
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Konfigurasi ini hanya berlaku di browser/perangkat ini. Setiap kasir bisa punya printer berbeda.
            </p>
          </DialogHeader>

          <div className="space-y-3">
            {TYPES.map(t => (
              <PrinterTypeCard
                key={t.key}
                type={t.key}
                label={t.label}
                onConfigure={handleConfigure}
              />
            ))}
          </div>

          <div className="border-t pt-3 text-xs text-muted-foreground">
            Jika tidak dikonfigurasi, printer default site akan digunakan sebagai fallback.
          </div>
        </DialogContent>
      </Dialog>

      {configuring && (
        <ConfigureDialog
          type={configuring.type}
          label={configuring.label}
          existing={configuring.existing}
          onSave={() => configuring.onRefresh?.()}
          onClose={() => setConfiguring(null)}
        />
      )}
    </>
  );
}
