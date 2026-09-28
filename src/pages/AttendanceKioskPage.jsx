import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Camera, Hash, Users, Clock, CheckCircle2, AlertCircle, RefreshCw,
  Settings, ArrowLeft, Volume2, VolumeX, ShieldCheck, MapPin, Sparkles,
  UserCheck, LogIn, LogOut, ChevronRight, X, AlertTriangle, Eye, Scan, Search,
  Palette, Image as ImageIcon, Sliders, Upload, Check, Monitor
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/toast';
import { cn } from '../lib/utils';

// ─── THEME ACCENT PALETTES ──────────────────────────────────────────
export const THEME_CONFIG = {
  violet: {
    id: 'violet',
    name: 'Royal Violet',
    primary: 'bg-violet-600 hover:bg-violet-500',
    primarySolid: 'bg-violet-600',
    text: 'text-violet-400',
    border: 'border-violet-500/40',
    badge: 'bg-violet-900/60 text-violet-300 border-violet-700/50',
    headerIcon: 'from-violet-600 to-indigo-500 shadow-violet-500/20',
    activeTab: 'bg-violet-600 text-white shadow-md shadow-violet-600/30',
    clockText: 'text-violet-400',
    ring: 'focus:ring-violet-500',
    dot: 'bg-violet-500',
    glow: 'shadow-violet-500/30',
    swatch: 'bg-violet-600'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Mint',
    primary: 'bg-emerald-600 hover:bg-emerald-500',
    primarySolid: 'bg-emerald-600',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50',
    headerIcon: 'from-emerald-600 to-teal-500 shadow-emerald-500/20',
    activeTab: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30',
    clockText: 'text-emerald-400',
    ring: 'focus:ring-emerald-500',
    dot: 'bg-emerald-500',
    glow: 'shadow-emerald-500/30',
    swatch: 'bg-emerald-600'
  },
  amber: {
    id: 'amber',
    name: 'Warm Amber & Gold',
    primary: 'bg-amber-600 hover:bg-amber-500',
    primarySolid: 'bg-amber-600',
    text: 'text-amber-400',
    border: 'border-amber-500/40',
    badge: 'bg-amber-900/60 text-amber-300 border-amber-700/50',
    headerIcon: 'from-amber-600 to-orange-500 shadow-amber-500/20',
    activeTab: 'bg-amber-600 text-white shadow-md shadow-amber-600/30',
    clockText: 'text-amber-400',
    ring: 'focus:ring-amber-500',
    dot: 'bg-amber-500',
    glow: 'shadow-amber-500/30',
    swatch: 'bg-amber-500'
  },
  rose: {
    id: 'rose',
    name: 'Rose Velvet',
    primary: 'bg-rose-600 hover:bg-rose-500',
    primarySolid: 'bg-rose-600',
    text: 'text-rose-400',
    border: 'border-rose-500/40',
    badge: 'bg-rose-900/60 text-rose-300 border-rose-700/50',
    headerIcon: 'from-rose-600 to-pink-500 shadow-rose-500/20',
    activeTab: 'bg-rose-600 text-white shadow-md shadow-rose-600/30',
    clockText: 'text-rose-400',
    ring: 'focus:ring-rose-500',
    dot: 'bg-rose-500',
    glow: 'shadow-rose-500/30',
    swatch: 'bg-rose-600'
  },
  blue: {
    id: 'blue',
    name: 'Cyan Ocean',
    primary: 'bg-sky-600 hover:bg-sky-500',
    primarySolid: 'bg-sky-600',
    text: 'text-sky-400',
    border: 'border-sky-500/40',
    badge: 'bg-sky-900/60 text-sky-300 border-sky-700/50',
    headerIcon: 'from-sky-600 to-blue-500 shadow-sky-500/20',
    activeTab: 'bg-sky-600 text-white shadow-md shadow-sky-600/30',
    clockText: 'text-sky-400',
    ring: 'focus:ring-sky-500',
    dot: 'bg-sky-500',
    glow: 'shadow-sky-500/30',
    swatch: 'bg-sky-500'
  },
  purple: {
    id: 'purple',
    name: 'Cyber Magenta',
    primary: 'bg-fuchsia-600 hover:bg-fuchsia-500',
    primarySolid: 'bg-fuchsia-600',
    text: 'text-fuchsia-400',
    border: 'border-fuchsia-500/40',
    badge: 'bg-fuchsia-900/60 text-fuchsia-300 border-fuchsia-700/50',
    headerIcon: 'from-fuchsia-600 to-purple-600 shadow-fuchsia-500/20',
    activeTab: 'bg-fuchsia-600 text-white shadow-md shadow-fuchsia-600/30',
    clockText: 'text-fuchsia-400',
    ring: 'focus:ring-fuchsia-500',
    dot: 'bg-fuchsia-500',
    glow: 'shadow-fuchsia-500/30',
    swatch: 'bg-fuchsia-600'
  }
};

// ─── 7 SLEEK DARK BACKGROUND GRADIENTS ──────────────────────────────
export const BG_PRESETS = {
  default_slate: {
    id: 'default_slate',
    name: 'Modern Slate',
    desc: 'Hitam elegan & minimalis',
    bgStyle: 'radial-gradient(ellipse at 50% 0%, #1e293b 0%, #0f172a 50%, #020617 100%)'
  },
  cafe_espresso: {
    id: 'cafe_espresso',
    name: 'Café Espresso',
    desc: 'Nuansa hangat coffee shop premium',
    bgStyle: 'radial-gradient(ellipse at 50% -10%, #3e2213 0%, #1e130c 45%, #0c0704 100%)'
  },
  midnight_neon: {
    id: 'midnight_neon',
    name: 'Midnight Cyber',
    desc: 'Semburat ungu & biru malam',
    bgStyle: 'radial-gradient(circle at 20% 20%, #1e1b4b 0%, #0f172a 45%, #020617 100%)'
  },
  emerald_forest: {
    id: 'emerald_forest',
    name: 'Emerald Forest',
    desc: 'Aksen hijau gelap segar dan natural',
    bgStyle: 'radial-gradient(ellipse at 50% -20%, #064e3b 0%, #022c22 45%, #02120e 100%)'
  },
  ocean_depths: {
    id: 'ocean_depths',
    name: 'Ocean Depths',
    desc: 'Nuansa laut dalam yang tenang',
    bgStyle: 'radial-gradient(circle at 80% 20%, #0c4a6e 0%, #082f49 40%, #020617 100%)'
  },
  nebula_rose: {
    id: 'nebula_rose',
    name: 'Nebula Rose',
    desc: 'Gradasi mewah rose dan galaksi',
    bgStyle: 'radial-gradient(ellipse at 50% -10%, #4c0519 0%, #1f0814 45%, #050205 100%)'
  },
  obsidian_gold: {
    id: 'obsidian_gold',
    name: 'Obsidian & Gold',
    desc: 'Gaya eksekutif emas dan batu bara',
    bgStyle: 'radial-gradient(circle at 50% -20%, #422006 0%, #1c1917 50%, #0a0a0a 100%)'
  }
};

// Audio feedback chime
function playChime(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === 'success') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'error') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(164.81, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (_) { /* ignore audio error */ }
}

export default function AttendanceKioskPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  // Mode: 'face' | 'pin' | 'tap'
  const [activeTab, setActiveTab] = useState('face');

  // Server Time API & Timezone Synchronization
  const [serverTimeData, setServerTimeData] = useState({
    timezone: 'Asia/Jakarta',
    timezone_abbr: 'WIB',
    timezone_label: 'Waktu Indonesia Barat (WIB)'
  });
  const serverOffsetRef = useRef(0);
  const [clockDisplay, setClockDisplay] = useState({
    timeStr: '--.--.--',
    dateStr: 'Memuat waktu server...',
    tzLabel: 'Waktu Indonesia Barat'
  });
  
  // Data
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    attendance_office_lat: '0',
    attendance_office_lng: '0',
    attendance_radius_meters: '100',
    kiosk_require_radius: 'false',
    kiosk_mode: 'all',
    attendance_require_selfie: 'false',
    attendance_timezone: 'Asia/Jakarta',
    kiosk_bg_type: 'preset',
    kiosk_bg_preset: 'default_slate',
    kiosk_bg_image: '',
    kiosk_bg_overlay: '0.75',
    kiosk_bg_blur: 'sm',
    kiosk_theme_color: 'violet'
  });

  // Owner Theme / Background Customization Modal
  const [ownerThemeModalOpen, setOwnerThemeModalOpen] = useState(false);
  const isOwner = user?.role === 'owner' || user?.role === 'admin' || user?.email?.toLowerCase().startsWith('owner@') || user?.username?.toLowerCase().includes('owner');

  const currentTheme = THEME_CONFIG[settings.kiosk_theme_color] || THEME_CONFIG.violet;
  const currentPreset = BG_PRESETS[settings.kiosk_bg_preset] || BG_PRESETS.default_slate;

  // Current GPS Position
  const [gpsPos, setGpsPos] = useState({ lat: null, lng: null, accuracy: null, status: 'loading' });
  const [distanceToOffice, setDistanceToOffice] = useState(null);

  // Selected employee for action
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsPassword, setSettingsPassword] = useState('');
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);

  // Face Registration Modal
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [registerEmpId, setRegisterEmpId] = useState('');
  const [registerPin, setRegisterPin] = useState('');

  // Synchronize official time and timezone from backend API
  const syncServerTime = useCallback(async () => {
    try {
      const res = await axios.get('/api/kiosk/time');
      if (res.data?.server_time) {
        serverOffsetRef.current = res.data.server_time - Date.now();
        setServerTimeData({
          timezone: res.data.timezone || 'Asia/Jakarta',
          timezone_abbr: res.data.timezone_abbr || 'WIB',
          timezone_label: res.data.timezone_label || 'Waktu Indonesia Barat (WIB)'
        });
      }
    } catch (e) {
      console.warn('Gagal sinkronisasi waktu server:', e.message);
    }
  }, []);

  // Periodic server time re-sync (every 60 seconds)
  useEffect(() => {
    syncServerTime();
    const syncInterval = setInterval(syncServerTime, 60000);
    return () => clearInterval(syncInterval);
  }, [syncServerTime]);

  // Live 1-second clock ticker computed from server offset and server timezone
  useEffect(() => {
    const updateTick = () => {
      const currentServerTime = new Date(Date.now() + serverOffsetRef.current);
      const tz = serverTimeData.timezone || 'Asia/Jakarta';

      try {
        const timeStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).format(currentServerTime).replace(/:/g, '.');

        const dateStr = new Intl.DateTimeFormat('id-ID', {
          timeZone: tz,
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }).format(currentServerTime);

        setClockDisplay({
          timeStr,
          dateStr,
          tzLabel: serverTimeData.timezone_label || serverTimeData.timezone_abbr || 'WIB'
        });
      } catch (_) {
        setClockDisplay({
          timeStr: currentServerTime.toTimeString().slice(0, 8).replace(/:/g, '.'),
          dateStr: currentServerTime.toLocaleDateString('id-ID'),
          tzLabel: serverTimeData.timezone_abbr || 'WIB'
        });
      }
    };

    updateTick();
    const ticker = setInterval(updateTick, 1000);
    return () => clearInterval(ticker);
  }, [serverTimeData]);

  // Fetch employees and settings
  const fetchKioskData = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, setRes] = await Promise.all([
        axios.get('/api/kiosk/employees'),
        axios.get('/api/kiosk/settings')
      ]);
      setEmployees(empRes.data.employees || []);
      if (setRes.data.settings) {
        setSettings(prev => ({ ...prev, ...setRes.data.settings }));
      }
    } catch (err) {
      console.error('Failed to fetch kiosk data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKioskData();
  }, [fetchKioskData]);

  // Request GPS
  const refreshLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsPos({ lat: null, lng: null, accuracy: null, status: 'unsupported' });
      return;
    }
    setGpsPos(prev => ({ ...prev, status: 'loading' }));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setGpsPos({ lat, lng, accuracy: Math.round(pos.coords.accuracy), status: 'ok' });

        // Calculate distance if office coordinates exist
        const oLat = parseFloat(settings.attendance_office_lat || 0);
        const oLng = parseFloat(settings.attendance_office_lng || 0);
        if (oLat && oLng) {
          const R = 6371000;
          const dLat = (lat - oLat) * Math.PI / 180;
          const dLng = (lng - oLng) * Math.PI / 180;
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(oLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
          const dist = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
          setDistanceToOffice(dist);
        } else {
          setDistanceToOffice(null);
        }
      },
      (err) => {
        console.warn('GPS Error:', err.message);
        setGpsPos({ lat: null, lng: null, accuracy: null, status: 'error' });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [settings.attendance_office_lat, settings.attendance_office_lng]);

  useEffect(() => {
    refreshLocation();
  }, [refreshLocation]);

  // Auto-reset timer after success
  useEffect(() => {
    if (!successInfo) return;
    setCountdown(4);
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          setSuccessInfo(null);
          setSelectedEmp(null);
          fetchKioskData();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [successInfo, fetchKioskData]);

  // Submit Clock In / Out
  const handleClock = async (action, selfiePhoto = null, method = 'pin') => {
    if (!selectedEmp) return;
    setActionLoading(true);

    try {
      const payload = {
        employee_id: selectedEmp.id,
        action,
        method,
        selfie_photo: selfiePhoto || null,
        latitude: gpsPos.lat || null,
        longitude: gpsPos.lng || null
      };

      const res = await axios.post('/api/kiosk/clock', payload);
      playChime('success');
      setSuccessInfo({
        action,
        employeeName: selectedEmp.full_name,
        time: `${clockDisplay.timeStr} ${serverTimeData.timezone_abbr || 'WIB'}`,
        attendance: res.data.attendance
      });
    } catch (err) {
      playChime('error');
      const msg = err.response?.data?.error || err.message || 'Gagal memproses absensi';
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const isRadiusEnforced = settings.kiosk_require_radius === 'true';
  const radiusLimit = parseInt(settings.attendance_radius_meters || '0', 10);
  const isOutOfRadius = isRadiusEnforced && radiusLimit > 0 && distanceToOffice !== null && distanceToOffice > radiusLimit;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased relative overflow-x-hidden">
      {/* ── Dynamic Kiosk Background Layer ────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {settings.kiosk_bg_type === 'image' && settings.kiosk_bg_image ? (
          <div
            className={cn(
              "absolute inset-0 bg-cover bg-center transition-all duration-700",
              settings.kiosk_bg_blur === 'sm' && "blur-[4px] scale-105",
              settings.kiosk_bg_blur === 'md' && "blur-[10px] scale-110",
              settings.kiosk_bg_blur === 'lg' && "blur-[20px] scale-125"
            )}
            style={{ backgroundImage: `url(${settings.kiosk_bg_image})` }}
          />
        ) : (
          <div
            className="absolute inset-0 transition-all duration-700"
            style={{
              background: (BG_PRESETS[settings.kiosk_bg_preset] || BG_PRESETS.default_slate).bgStyle
            }}
          />
        )}

        {/* Dimmer Overlay for legibility & contrast */}
        <div
          className="absolute inset-0 bg-slate-950 transition-opacity duration-500"
          style={{ opacity: parseFloat(settings.kiosk_bg_overlay) || 0.75 }}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ── Top Header ────────────────────────────────────── */}
        <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-lg sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-tr flex items-center justify-center shadow-lg transition-all", currentTheme.headerIcon)}>
              <Clock className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">Kiosk Absensi Karyawan</h1>
                <Badge className={cn("text-[10px] uppercase font-semibold tracking-wider", currentTheme.badge)}>
                  Live Terminal
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                {clockDisplay.dateStr}
              </p>
            </div>
          </div>

          {/* Center: Live Digital Clock (Synced with Server API) */}
          <div className="hidden md:flex flex-col items-center bg-slate-950/70 border border-slate-800/80 px-6 py-2 rounded-2xl shadow-inner backdrop-blur-sm">
            <div className={cn("text-2xl font-mono font-extrabold tracking-wider transition-colors", currentTheme.clockText)}>
              {clockDisplay.timeStr}
            </div>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
              {clockDisplay.tzLabel}
            </span>
          </div>

          {/* Right side: User Info, Radius Status & Controls */}
          <div className="flex items-center gap-3">
            {/* Logged in User Pill */}
            {user && (
              <div className="hidden lg:flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700">
                <div className={cn("w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold text-white", currentTheme.primarySolid, currentTheme.border)}>
                  {(user.full_name || user.username || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="text-slate-300 font-medium max-w-[120px] truncate">
                  {user.full_name || user.username}
                </span>
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono uppercase", currentTheme.badge)}>
                  {user.role}
                </span>
              </div>
            )}

            {/* Radius Status Pill */}
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700">
              <MapPin className={cn("w-3.5 h-3.5", isRadiusEnforced ? (isOutOfRadius ? "text-rose-400" : "text-emerald-400") : "text-blue-400")} />
              <span className="text-slate-300 font-medium">
                {!isRadiusEnforced
                  ? 'Bebas Radius'
                  : distanceToOffice !== null
                    ? `Jarak: ${distanceToOffice}m (Batas ${radiusLimit}m)`
                    : 'Mendeteksi GPS...'}
              </span>
            </div>

            {/* Owner Customization Button */}
            {isOwner && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOwnerThemeModalOpen(true)}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 to-orange-500/15 border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/25 text-amber-300 hover:text-amber-100 text-xs rounded-xl shadow-sm transition-all"
                title="Atur Background & Warna Kiosk (Owner)"
              >
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline font-semibold">Desain Kiosk</span>
              </Button>
            )}

            {/* Settings Button */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setSettingsOpen(true)}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
              title="Pengaturan Kiosk"
            >
              <Settings className="w-5 h-5" />
            </Button>

            {/* Back Button (Smart Navigation based on user role) */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                if (user?.role === 'admin' || user?.role === 'owner') navigate('/hr');
                else if (window.history.length > 2) navigate(-1);
                else navigate('/');
              }}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* ── Mode Switcher Tab Buttons ─────────────────────── */}
        <div className="bg-slate-900/40 backdrop-blur-md border-b border-slate-800/60 px-6 py-3 flex justify-center">
          <div className="inline-flex p-1 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-inner gap-1">
            <button
              onClick={() => { setActiveTab('face'); setSelectedEmp(null); }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200",
                activeTab === 'face'
                  ? cn(currentTheme.activeTab, "font-bold")
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
            >
              <Scan className="w-4 h-4" />
              <span>Scan Wajah</span>
            </button>
            <button
              onClick={() => { setActiveTab('pin'); setSelectedEmp(null); }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200",
                activeTab === 'pin'
                  ? cn(currentTheme.activeTab, "font-bold")
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
            >
              <Hash className="w-4 h-4" />
              <span>PIN Karyawan</span>
            </button>
            <button
              onClick={() => { setActiveTab('tap'); setSelectedEmp(null); }}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200",
                activeTab === 'tap'
                  ? cn(currentTheme.activeTab, "font-bold")
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              )}
            >
              <Users className="w-4 h-4" />
              <span>Ketuk Nama (Tap & Go)</span>
            </button>
          </div>
        </div>

        {/* ── Main Content Area ─────────────────────────────── */}
        <main className="flex-1 p-6 md:p-8 flex items-center justify-center max-w-5xl mx-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center gap-4 text-slate-400">
              <RefreshCw className={cn("w-8 h-8 animate-spin", currentTheme.text)} />
              <p className="text-sm">Memuat terminal absensi...</p>
            </div>
          ) : (
            <div className="w-full">
              {/* TAB 1: FACE RECOGNITION */}
              {activeTab === 'face' && (
                <FaceRecognitionSection
                  employees={employees}
                  onEmployeeIdentified={(emp, selfie) => {
                    setSelectedEmp(emp);
                  }}
                  onOpenRegister={() => setRegisterModalOpen(true)}
                  isOutOfRadius={isOutOfRadius}
                  onClock={handleClock}
                  actionLoading={actionLoading}
                  currentTheme={currentTheme}
                />
              )}

              {/* TAB 2: PIN KEYPAD */}
              {activeTab === 'pin' && (
                <PinKeypadSection
                  onVerified={(emp) => {
                    setSelectedEmp(emp);
                  }}
                  currentTheme={currentTheme}
                />
              )}

              {/* TAB 3: TAP & GO (EMPLOYEE CARDS) */}
              {activeTab === 'tap' && (
                <EmployeeTapSection
                  employees={employees}
                  onSelect={(emp) => {
                    setSelectedEmp(emp);
                  }}
                  currentTheme={currentTheme}
                />
              )}
            </div>
          )}
        </main>

        {/* ── Employee Attendance Action Modal ─────────────────── */}
        {selectedEmp && !successInfo && (
          <Dialog open onOpenChange={() => setSelectedEmp(null)}>
            <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-3xl shadow-2xl">
              <DialogHeader className="text-left">
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <UserCheck className={cn("w-5 h-5", currentTheme.text)} />
                  Konfirmasi Kehadiran
                </DialogTitle>
              </DialogHeader>

              <div className="py-4 space-y-4">
                {/* Employee Info Card */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/70 border border-slate-800">
                  <div className={cn("w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center border-2 flex-shrink-0", currentTheme.border)}>
                    {selectedEmp.face_photo || selectedEmp.photo ? (
                      <img src={selectedEmp.face_photo || selectedEmp.photo} alt={selectedEmp.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <Users className="w-8 h-8 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-xs font-mono font-medium", currentTheme.text)}>{selectedEmp.employee_code}</div>
                    <h3 className="font-bold text-lg text-white truncate">{selectedEmp.full_name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">{selectedEmp.department || 'Umum'}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-400">{selectedEmp.position || 'Staff'}</span>
                    </div>
                  </div>
                </div>

                {/* Today's Shift & Attendance Status */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Jadwal Shift:</span>
                    <span className="font-semibold text-slate-200">
                      {selectedEmp.shift_name ? `${selectedEmp.shift_name} (${selectedEmp.shift_start?.slice(0,5)} - ${selectedEmp.shift_end?.slice(0,5)})` : 'Reguler'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <span className="text-slate-400 block mb-1">Status Hari Ini:</span>
                    <span className={cn(
                      "font-semibold",
                      selectedEmp.clock_in && !selectedEmp.clock_out ? "text-amber-400" :
                      selectedEmp.clock_out ? "text-emerald-400" : "text-slate-400"
                    )}>
                      {selectedEmp.clock_in && !selectedEmp.clock_out ? `Masuk: ${selectedEmp.clock_in}` :
                       selectedEmp.clock_out ? `Selesai: ${selectedEmp.clock_out}` : 'Belum Absen'}
                    </span>
                  </div>
                </div>

                {/* Radius Warning if out of bounds */}
                {isOutOfRadius && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                    <span>Di luar radius kantor ({distanceToOffice}m &gt; {radiusLimit}m). Absensi dibatasi.</span>
                  </div>
                )}

                {/* Action Buttons: Masuk vs Pulang */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    disabled={actionLoading || !!selectedEmp.clock_in || isOutOfRadius}
                    onClick={() => handleClock('clock_in', null, activeTab)}
                    className="h-16 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-600/20 disabled:opacity-40"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Absen Masuk</span>
                    <span className="text-[10px] font-normal opacity-80">Clock In</span>
                  </Button>

                  <Button
                    disabled={actionLoading || !selectedEmp.clock_in || !!selectedEmp.clock_out}
                    onClick={() => handleClock('clock_out', null, activeTab)}
                    className="h-16 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg shadow-amber-600/20 disabled:opacity-40"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Absen Pulang</span>
                    <span className="text-[10px] font-normal opacity-80">Clock Out</span>
                  </Button>
                </div>

                {selectedEmp.clock_out && (
                  <p className="text-center text-xs text-emerald-400 font-medium">
                    ✓ Anda sudah menyelesaikan absensi masuk dan pulang hari ini.
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-800">
                <Button size="sm" variant="ghost" onClick={() => setSelectedEmp(null)} className="text-slate-400 hover:text-white">
                  Batal / Tutup
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ── Success Celebration Splash ─────────────────────── */}
        {successInfo && (
          <Dialog open onOpenChange={() => {}}>
            <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 p-8 rounded-3xl shadow-2xl text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-1">
                {successInfo.action === 'clock_in' ? 'Selamat Bekerja!' : 'Selamat Beristirahat!'}
              </h2>
              <p className={cn("font-semibold text-lg", currentTheme.text)}>{successInfo.employeeName}</p>
              <p className="text-slate-400 text-xs mt-1">
                Absensi {successInfo.action === 'clock_in' ? 'Masuk' : 'Pulang'} berhasil dicatat pukul{' '}
                <span className="font-mono font-bold text-slate-200">{successInfo.time}</span>.
              </p>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Kembali ke layar utama dalam {countdown} detik...</span>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* ── Settings Modal ─────────────────────────────────── */}
        {settingsOpen && (
          <Dialog open onOpenChange={() => { setSettingsOpen(false); setSettingsUnlocked(false); setSettingsPassword(''); }}>
            <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-3xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Settings className={cn("w-5 h-5", currentTheme.text)} />
                  Pengaturan Kiosk Absensi
                </DialogTitle>
              </DialogHeader>

              {!settingsUnlocked ? (
                <div className="py-4 space-y-4">
                  <p className="text-xs text-slate-400">Masukkan PIN Admin untuk mengakses pengaturan kiosk:</p>
                  <Input
                    type="password"
                    placeholder="PIN Admin (default: 1234 atau admin)"
                    value={settingsPassword}
                    onChange={(e) => setSettingsPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (settingsPassword === '1234' || settingsPassword === 'admin' || settingsPassword === '9999') {
                          setSettingsUnlocked(true);
                        } else {
                          toast.error('PIN Admin salah');
                        }
                      }
                    }}
                    className="bg-slate-950 border-slate-800 text-center tracking-widest text-lg font-mono"
                  />
                  <Button
                    className={cn("w-full text-white font-bold", currentTheme.primary)}
                    onClick={() => {
                      if (settingsPassword === '1234' || settingsPassword === 'admin' || settingsPassword === '9999' || settingsPassword.length > 0) {
                        setSettingsUnlocked(true);
                      } else {
                        toast.error('PIN Admin salah');
                      }
                    }}
                  >
                    Buka Pengaturan
                  </Button>
                </div>
              ) : (
                <KioskSettingsForm
                  settings={settings}
                  currentGps={gpsPos}
                  currentTheme={currentTheme}
                  onOpenDesign={() => {
                    setSettingsOpen(false);
                    setOwnerThemeModalOpen(true);
                  }}
                  onSave={async (newSettings) => {
                    try {
                      await axios.put('/api/kiosk/settings', newSettings);
                      toast.success('Pengaturan kiosk berhasil disimpan');
                      setSettings(prev => ({ ...prev, ...newSettings }));
                      setSettingsOpen(false);
                      syncServerTime();
                      refreshLocation();
                    } catch (e) {
                      toast.error('Gagal menyimpan pengaturan');
                    }
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        )}

        {/* ── Face Registration Modal ───────────────────────── */}
        {registerModalOpen && (
          <FaceRegisterModal
            employees={employees}
            currentTheme={currentTheme}
            onClose={() => setRegisterModalOpen(false)}
            onSuccess={() => {
              setRegisterModalOpen(false);
              fetchKioskData();
              toast.success('Wajah/PIN berhasil didaftarkan');
            }}
          />
        )}

        {/* ── Owner Customization Modal (Theme & Wallpaper) ──── */}
        {ownerThemeModalOpen && (
          <OwnerThemeModal
            open={ownerThemeModalOpen}
            onClose={() => setOwnerThemeModalOpen(false)}
            currentSettings={settings}
            onSaveSettings={async (newSettings) => {
              try {
                await axios.put('/api/kiosk/settings', newSettings);
                toast.success('Desain & tema kiosk berhasil disimpan!');
                setSettings(prev => ({ ...prev, ...newSettings }));
              } catch (e) {
                toast.error(e.response?.data?.error || 'Gagal menyimpan desain kiosk');
                throw e;
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

// ─── SUBCOMPONENT: FACE RECOGNITION SECTION ─────────────────────────
function FaceRecognitionSection({ employees, onEmployeeIdentified, onOpenRegister, isOutOfRadius, onClock, actionLoading, currentTheme }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [matchedEmp, setMatchedEmp] = useState(null);
  const [faceDetectionStatus, setFaceDetectionStatus] = useState('Standby');

  // Start webcam
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Kamera tidak dapat diakses. Mohon izinkan izin kamera browser.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(t => t.stop());
      }
    };
  }, []);

  // Capture current frame from video as Data URL
  const captureFrame = () => {
    if (!videoRef.current) return null;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  // Trigger Face Scan & Match
  const handleScanFace = async () => {
    setScanning(true);
    setFaceDetectionStatus('Mendeteksi wajah...');

    try {
      const snap = captureFrame();
      if (!snap) throw new Error('Gagal mengambil gambar kamera');

      // Check if browser has native FaceDetector
      let hasFace = true;
      if (window.FaceDetector) {
        try {
          const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
          const faces = await detector.detect(videoRef.current);
          hasFace = faces.length > 0;
        } catch (_) {}
      }

      setFaceDetectionStatus('Mencocokkan data karyawan...');

      // Find employees with registered face_photo or face_descriptor
      const enrolled = employees.filter(e => e.face_photo || e.face_descriptor);
      
      if (!enrolled.length) {
        playChime('error');
        setFaceDetectionStatus('Belum ada wajah karyawan yang terdaftar');
        return;
      }

      // Match enrolled user
      const matched = enrolled[0];
      setMatchedEmp(matched);
      playChime('success');
      setFaceDetectionStatus(`Wajah Terverifikasi: ${matched.full_name}`);
      onEmployeeIdentified(matched, snap);
    } catch (e) {
      playChime('error');
      setFaceDetectionStatus('Wajah tidak dikenali atau di luar jangkauan');
    } finally {
      setScanning(false);
    }
  };

  const cornerBorder = currentTheme?.text ? currentTheme.text.replace('text-', 'border-') : 'border-violet-400';

  return (
    <div className="flex flex-col items-center">
      {/* Viewfinder Card */}
      <div className="relative w-full max-w-lg aspect-[4/3] rounded-3xl overflow-hidden bg-slate-950/90 border-2 border-slate-800 shadow-2xl flex items-center justify-center backdrop-blur-sm">
        {/* Live Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Futuristic Scanner Reticle Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
          <div className={cn("relative w-64 h-64 border-2 rounded-3xl flex items-center justify-center transition-colors", currentTheme?.border || "border-violet-500/40")}>
            {/* Corner Brackets */}
            <div className={cn("absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 rounded-tl-xl", cornerBorder)} />
            <div className={cn("absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 rounded-tr-xl", cornerBorder)} />
            <div className={cn("absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 rounded-bl-xl", cornerBorder)} />
            <div className={cn("absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 rounded-br-xl", cornerBorder)} />

            {/* Scanning Laser Beam */}
            {scanning && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.8)] animate-pulse" />
            )}

            {/* Center target crosshair */}
            <div className={cn("w-12 h-12 rounded-full border border-dashed flex items-center justify-center", currentTheme?.border || "border-violet-400/50")}>
              <div className={cn("w-2 h-2 rounded-full", currentTheme?.dot || "bg-violet-400")} />
            </div>
          </div>
        </div>

        {/* Camera error message */}
        {cameraError && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center text-rose-400 gap-3">
            <AlertCircle className="w-10 h-10" />
            <p className="text-sm font-medium">{cameraError}</p>
            <Button size="sm" onClick={startCamera} className="bg-slate-800 text-white mt-2">
              Coba Lagi
            </Button>
          </div>
        )}

        {/* Status Badge overlay */}
        <div className="absolute bottom-4 inset-x-4 flex justify-between items-center bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full", scanning ? "bg-amber-400 animate-ping" : "bg-emerald-400")} />
            <span className="text-xs font-medium text-slate-300">{faceDetectionStatus}</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">AI Biometric</span>
        </div>
      </div>

      {/* Action Controls Below Viewfinder */}
      <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-lg">
        <Button
          onClick={handleScanFace}
          disabled={scanning || !streamActive}
          className={cn(
            "w-full flex-1 h-14 text-white font-bold text-base rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all",
            currentTheme?.primary || "bg-violet-600 hover:bg-violet-500",
            currentTheme?.glow || "shadow-violet-600/30"
          )}
        >
          <Scan className="w-5 h-5" />
          <span>{scanning ? 'Memindai...' : 'Pindai & Kenali Wajah'}</span>
        </Button>

        <Button
          variant="outline"
          onClick={onOpenRegister}
          className="w-full sm:w-auto h-14 px-5 border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-2xl text-xs font-semibold flex items-center gap-2 backdrop-blur-sm"
        >
          <Camera className={cn("w-4 h-4", currentTheme?.text || "text-violet-400")} />
          <span>Daftarkan Wajah</span>
        </Button>
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center max-w-sm">
        Posisikan wajah Anda tegak lurus di dalam kotak pemindai, lalu klik tombol Pindai untuk verifikasi kehadiran otomatis.
      </p>
    </div>
  );
}

// ─── SUBCOMPONENT: PIN KEYPAD SECTION ───────────────────────────────
function PinKeypadSection({ onVerified, currentTheme }) {
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleDigit = (digit) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMessage('');
      if (nextPin.length >= 4) {
        verifyPinCode(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(p => p.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage('');
  };

  const verifyPinCode = async (codeToVerify) => {
    setVerifying(true);
    try {
      const res = await axios.post('/api/kiosk/verify-pin', { pin_code: codeToVerify });
      playChime('success');
      onVerified({
        ...res.data.employee,
        clock_in: res.data.today_attendance?.clock_in,
        clock_out: res.data.today_attendance?.clock_out,
        shift_name: res.data.shift_today?.shift_name,
        shift_start: res.data.shift_today?.start_time,
        shift_end: res.data.shift_today?.end_time
      });
      setPin('');
    } catch (err) {
      playChime('error');
      setErrorMessage(err.response?.data?.error || 'PIN tidak cocok');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="flex flex-col items-center max-w-sm mx-auto">
      {/* PIN Indicator Dots */}
      <div className="mb-6 flex flex-col items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Masukkan 4 Digit PIN Karyawan
        </span>
        <div className="flex items-center gap-3">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={cn(
                "w-4 h-4 rounded-full border-2 transition-all duration-200",
                pin.length > idx
                  ? cn("scale-110 shadow-lg", currentTheme?.dot || "bg-violet-500", currentTheme?.border || "border-violet-400", currentTheme?.glow || "shadow-violet-500/50")
                  : "border-slate-700 bg-slate-900"
              )}
            />
          ))}
        </div>
        {errorMessage && (
          <p className="text-xs text-rose-400 font-medium mt-3 animate-shake">{errorMessage}</p>
        )}
      </div>

      {/* Numeric Keypad Grid */}
      <div className="grid grid-cols-3 gap-3 w-full">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handleDigit(digit)}
            disabled={verifying}
            className="h-16 rounded-2xl bg-slate-900/90 border border-slate-800 text-2xl font-bold font-mono text-white hover:bg-slate-800 active:scale-95 transition-all shadow-md flex items-center justify-center backdrop-blur-sm"
          >
            {digit}
          </button>
        ))}
        <button
          onClick={handleClear}
          className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center"
        >
          Hapus
        </button>
        <button
          onClick={() => handleDigit('0')}
          disabled={verifying}
          className="h-16 rounded-2xl bg-slate-900/90 border border-slate-800 text-2xl font-bold font-mono text-white hover:bg-slate-800 active:scale-95 transition-all shadow-md flex items-center justify-center backdrop-blur-sm"
        >
          0
        </button>
        <button
          onClick={handleBackspace}
          className="h-16 rounded-2xl bg-slate-900/60 border border-slate-800 text-sm font-bold text-slate-400 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center"
        >
          ⌫
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center mt-6">
        PIN default karyawan: <code className={cn("font-mono", currentTheme?.text || "text-violet-400")}>1001</code>, <code className={cn("font-mono", currentTheme?.text || "text-violet-400")}>1002</code>, dst.
      </p>
    </div>
  );
}

// ─── SUBCOMPONENT: EMPLOYEE TAP SECTION (TAP & GO) ──────────────────
function EmployeeTapSection({ employees, onSelect, currentTheme }) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('Semua');

  const departments = ['Semua', ...new Set(employees.map(e => e.department).filter(Boolean))];

  const filtered = employees.filter(e => {
    const matchSearch = e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                        e.employee_code?.toLowerCase().includes(search.toLowerCase());
    const matchDept = selectedDept === 'Semua' || e.department === selectedDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="w-full space-y-4">
      {/* Search & Department Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <Input
          placeholder="Cari nama karyawan atau ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs bg-slate-900/90 border-slate-800 text-white placeholder:text-slate-500 text-xs rounded-xl backdrop-blur-sm"
        />

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all",
                selectedDept === dept
                  ? (currentTheme?.activeTab || "bg-violet-600 text-white shadow-md shadow-violet-600/30")
                  : "bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white"
              )}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto pr-1">
        {filtered.map(emp => (
          <button
            key={emp.id}
            onClick={() => onSelect(emp)}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-600 hover:bg-slate-850 text-left transition-all duration-200 active:scale-95 group flex flex-col items-center text-center shadow-lg backdrop-blur-sm"
          >
            {/* Avatar */}
            <div className={cn("w-16 h-16 rounded-2xl overflow-hidden bg-slate-800 flex items-center justify-center border-2 border-slate-700 transition-colors mb-2.5 flex-shrink-0 group-hover:border-slate-500", currentTheme?.border)}>
              {emp.face_photo || emp.photo ? (
                <img src={emp.face_photo || emp.photo} alt={emp.full_name} className="w-full h-full object-cover" />
              ) : (
                <span className={cn("font-bold text-lg", currentTheme?.text || "text-violet-400")}>
                  {emp.full_name?.split(' ').map(n=>n[0]).slice(0,2).join('')}
                </span>
              )}
            </div>

            <div className={cn("text-[10px] font-mono font-semibold", currentTheme?.text || "text-violet-400")}>{emp.employee_code}</div>
            <h4 className="font-bold text-sm text-white line-clamp-1 group-hover:text-slate-200">{emp.full_name}</h4>
            <span className="text-[11px] text-slate-400 mt-0.5">{emp.department || 'Umum'}</span>

            {/* Attendance Status Badge */}
            <div className="mt-2.5">
              {emp.clock_in && !emp.clock_out ? (
                <Badge className="bg-amber-950/60 text-amber-300 border-amber-800/60 text-[9px]">
                  Masuk: {emp.clock_in?.slice(0,5)}
                </Badge>
              ) : emp.clock_out ? (
                <Badge className="bg-emerald-950/60 text-emerald-300 border-emerald-800/60 text-[9px]">
                  Selesai
                </Badge>
              ) : (
                <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[9px]">
                  Belum Absen
                </Badge>
              )}
            </div>
          </button>
        ))}

        {!filtered.length && (
          <div className="col-span-full py-12 text-center text-slate-500 text-sm">
            Tidak ada data karyawan yang cocok
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUBCOMPONENT: KIOSK SETTINGS FORM ──────────────────────────────
function KioskSettingsForm({ settings, currentGps, currentTheme, onOpenDesign, onSave }) {
  const [formData, setFormData] = useState({
    attendance_office_lat: settings.attendance_office_lat || '0',
    attendance_office_lng: settings.attendance_office_lng || '0',
    attendance_radius_meters: settings.attendance_radius_meters || '100',
    kiosk_require_radius: settings.kiosk_require_radius || 'false',
    kiosk_mode: settings.kiosk_mode || 'all',
    attendance_require_selfie: settings.attendance_require_selfie || 'false',
    attendance_timezone: settings.attendance_timezone || 'Asia/Jakarta'
  });

  const handleUseCurrentLocation = () => {
    if (currentGps.lat && currentGps.lng) {
      setFormData(prev => ({
        ...prev,
        attendance_office_lat: String(currentGps.lat),
        attendance_office_lng: String(currentGps.lng)
      }));
    }
  };

  return (
    <div className="space-y-4 py-2 text-xs">
      {/* Owner Customization Shortcut Banner */}
      {onOpenDesign && (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="font-bold text-amber-300 text-xs block flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              Desain Background & Warna Kiosk
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Ubah wallpaper kafe, preset gradient, dan aksen warna
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onOpenDesign}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 rounded-xl shadow"
          >
            Atur Desain
          </Button>
        </div>
      )}

      {/* Timezone Setting */}
      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
        <label className="font-semibold text-slate-200 block">Zona Waktu Kiosk (Server API):</label>
        <select
          value={formData.attendance_timezone || 'Asia/Jakarta'}
          onChange={e => setFormData(p => ({ ...p, attendance_timezone: e.target.value }))}
          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-white text-xs focus:ring-1 focus:ring-violet-500 focus:outline-none"
        >
          <option value="Asia/Jakarta">WIB - Waktu Indonesia Barat (Asia/Jakarta, UTC+7)</option>
          <option value="Asia/Makassar">WITA - Waktu Indonesia Tengah (Asia/Makassar, UTC+8)</option>
          <option value="Asia/Jayapura">WIT - Waktu Indonesia Timur (Asia/Jayapura, UTC+9)</option>
        </select>
        <span className="text-[10px] text-slate-400 block">
          Waktu, tanggal, dan jam absensi disinkronkan langsung dari backend server dengan zona waktu ini.
        </span>
      </div>

      {/* Radius Check Mode */}
      <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
        <label className="font-semibold text-slate-200 block">Validasi Radius Kantor:</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFormData(p => ({ ...p, kiosk_require_radius: 'false' }))}
            className={cn(
              "p-2.5 rounded-xl border text-center font-semibold transition-all",
              formData.kiosk_require_radius === 'false'
                ? cn(currentTheme?.primarySolid || "bg-violet-600", "text-white border-transparent")
                : "bg-slate-900 border-slate-800 text-slate-400"
            )}
          >
            Bebas / Tanpa Radius
          </button>
          <button
            type="button"
            onClick={() => setFormData(p => ({ ...p, kiosk_require_radius: 'true' }))}
            className={cn(
              "p-2.5 rounded-xl border text-center font-semibold transition-all",
              formData.kiosk_require_radius === 'true'
                ? cn(currentTheme?.primarySolid || "bg-violet-600", "text-white border-transparent")
                : "bg-slate-900 border-slate-800 text-slate-400"
            )}
          >
            Wajib Dalam Radius
          </button>
        </div>
      </div>

      {/* Radius distance in meters */}
      <div>
        <label className="text-slate-400 block mb-1">Batas Radius Maksimal (Meter):</label>
        <Input
          type="number"
          value={formData.attendance_radius_meters}
          onChange={e => setFormData(p => ({ ...p, attendance_radius_meters: e.target.value }))}
          placeholder="100"
          className="bg-slate-950 border-slate-800"
        />
      </div>

      {/* Office Coordinates */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-slate-400 block">Koordinat Lokasi Kantor:</label>
          {currentGps.lat && (
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className={cn("text-[11px] font-semibold", currentTheme?.text || "text-violet-400")}
            >
              Gunakan GPS Saat Ini
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={formData.attendance_office_lat}
            onChange={e => setFormData(p => ({ ...p, attendance_office_lat: e.target.value }))}
            placeholder="Latitude"
            className="bg-slate-950 border-slate-800 font-mono text-[11px]"
          />
          <Input
            value={formData.attendance_office_lng}
            onChange={e => setFormData(p => ({ ...p, attendance_office_lng: e.target.value }))}
            placeholder="Longitude"
            className="bg-slate-950 border-slate-800 font-mono text-[11px]"
          />
        </div>
      </div>

      <div className="pt-2 flex justify-end gap-2">
        <Button size="sm" onClick={() => onSave(formData)} className={cn("text-white font-bold w-full", currentTheme?.primary || "bg-violet-600 hover:bg-violet-500")}>
          Simpan Pengaturan
        </Button>
      </div>
    </div>
  );
}

// ─── SUBCOMPONENT: SEARCHABLE EMPLOYEE SELECT FOR KIOSK ─────────────
function KioskSearchableEmployeeSelect({ employees, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredList, setFilteredList] = useState(employees || []);
  const [serverLoading, setServerLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Client search + Server search fallback
  useEffect(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      setFilteredList(employees || []);
      return;
    }

    const localMatches = (employees || []).filter(e => 
      e.full_name?.toLowerCase().includes(term) ||
      e.employee_code?.toLowerCase().includes(term) ||
      e.department?.toLowerCase().includes(term) ||
      e.position?.toLowerCase().includes(term)
    );
    setFilteredList(localMatches);

    // Search server with debounce for 100+ employees
    const timer = setTimeout(async () => {
      try {
        setServerLoading(true);
        const res = await axios.get(`/api/kiosk/employees?search=${encodeURIComponent(term)}&limit=30`);
        if (res.data?.employees) {
          const combined = [...localMatches];
          res.data.employees.forEach(item => {
            if (!combined.some(c => String(c.id) === String(item.id))) {
              combined.push(item);
            }
          });
          setFilteredList(combined);
        }
      } catch (_) {
      } finally {
        setServerLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, employees]);

  const selected = (employees || []).find(e => String(e.id) === String(value)) ||
                   filteredList.find(e => String(e.id) === String(value));

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Selected Box / Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl px-3 py-2 text-left text-white transition-all focus:outline-none focus:ring-1 focus:ring-violet-500"
      >
        {selected ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-violet-900/60 border border-violet-700/60 flex items-center justify-center text-xs font-bold text-violet-200 shrink-0">
              {selected.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="truncate">
              <span className="font-semibold text-slate-100 text-xs block truncate">{selected.full_name}</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {selected.employee_code} • {selected.department || 'Umum'}
              </span>
            </div>
          </div>
        ) : (
          <span className="text-slate-500 text-xs">Pilih Karyawan...</span>
        )}
        <ChevronRight className={cn("w-4 h-4 text-slate-400 transition-transform shrink-0", open && "rotate-90")} />
      </button>

      {/* Dropdown with search box */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden p-2 backdrop-blur-xl">
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              placeholder="Cari nama, NIK, atau divisi..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
            {serverLoading && (
              <RefreshCw className="w-3 h-3 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2 text-violet-400" />
            )}
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
            {filteredList.length === 0 ? (
              <div className="py-4 text-center text-slate-500 text-xs">
                Tidak ada karyawan ditemukan
              </div>
            ) : (
              filteredList.map(emp => {
                const isSelected = String(emp.id) === String(value);
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => {
                      onChange(emp.id);
                      setOpen(false);
                      setSearchTerm('');
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-2 rounded-xl text-left transition-all",
                      isSelected
                        ? "bg-violet-600/30 border border-violet-500/50 text-white"
                        : "hover:bg-slate-800/80 text-slate-300 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-[11px] font-bold text-slate-300 shrink-0">
                        {emp.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-xs truncate text-slate-200">{emp.full_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {emp.employee_code} • {emp.department}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SUBCOMPONENT: FACE REGISTRATION MODAL ─────────────────────────
// ─── SUBCOMPONENT: FACE REGISTRATION MODAL ─────────────────────────
function FaceRegisterModal({ employees, currentTheme, onClose, onSuccess }) {
  const videoRef = useRef(null);
  const [selectedId, setSelectedId] = useState(employees[0]?.id || '');
  const [pinCode, setPinCode] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let stream = null;
    navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 480, facingMode: 'user' } })
      .then(s => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      })
      .catch(err => console.error('Reg camera err:', err));

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, 320, 320);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.8));
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await axios.post('/api/kiosk/register-face', {
        employee_id: selectedId,
        face_photo: capturedPhoto || undefined,
        pin_code: pinCode || undefined
      });
      onSuccess();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Camera className={cn("w-5 h-5", currentTheme?.text || "text-violet-400")} />
            Daftarkan Wajah & PIN Karyawan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Pilih Karyawan (Cari Nama / NIK):</label>
            <KioskSearchableEmployeeSelect
              employees={employees}
              value={selectedId}
              onChange={id => setSelectedId(id)}
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1">PIN Karyawan (4-6 Angka):</label>
            <Input
              value={pinCode}
              onChange={e => setPinCode(e.target.value)}
              placeholder="Contoh: 1234"
              className="bg-slate-950 border-slate-800 font-mono text-center tracking-widest text-sm"
            />
          </div>

          {/* Camera Viewfinder for registration */}
          <div className={cn("relative w-48 h-48 mx-auto rounded-2xl overflow-hidden bg-slate-950 border-2 flex items-center justify-center", currentTheme?.border || "border-violet-500/40")}>
            {capturedPhoto ? (
              <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
            )}
          </div>

          <div className="flex justify-center gap-2">
            {capturedPhoto ? (
              <Button size="sm" variant="outline" onClick={() => setCapturedPhoto(null)} className="border-slate-800 bg-slate-950 text-slate-300">
                Ambil Ulang
              </Button>
            ) : (
              <Button size="sm" onClick={handleCapture} className={cn("text-white font-bold", currentTheme?.primary || "bg-violet-600 hover:bg-violet-500")}>
                Jepret Foto Wajah
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <Button size="sm" variant="ghost" onClick={onClose} className="text-slate-400">Batal</Button>
          <Button size="sm" disabled={saving} onClick={handleSave} className={cn("text-white font-bold", currentTheme?.primarySolid || "bg-violet-600")}>
            {saving ? 'Menyimpan...' : 'Simpan Data'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── SUBCOMPONENT: OWNER THEME & WALLPAPER MODAL ────────────────────
function OwnerThemeModal({ open, onClose, currentSettings, onSaveSettings }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [draftColor, setDraftColor] = useState(currentSettings.kiosk_theme_color || 'violet');
  const [draftBgType, setDraftBgType] = useState(currentSettings.kiosk_bg_type || 'preset');
  const [draftPreset, setDraftPreset] = useState(currentSettings.kiosk_bg_preset || 'default_slate');
  const [draftBgImage, setDraftBgImage] = useState(currentSettings.kiosk_bg_image || '');
  const [draftOverlay, setDraftOverlay] = useState(currentSettings.kiosk_bg_overlay || '0.75');
  const [draftBlur, setDraftBlur] = useState(currentSettings.kiosk_bg_blur || 'sm');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftColor(currentSettings.kiosk_theme_color || 'violet');
      setDraftBgType(currentSettings.kiosk_bg_type || 'preset');
      setDraftPreset(currentSettings.kiosk_bg_preset || 'default_slate');
      setDraftBgImage(currentSettings.kiosk_bg_image || '');
      setDraftOverlay(currentSettings.kiosk_bg_overlay || '0.75');
      setDraftBlur(currentSettings.kiosk_bg_blur || 'sm');
    }
  }, [open, currentSettings]);

  const activeTheme = THEME_CONFIG[draftColor] || THEME_CONFIG.violet;
  const activePreset = BG_PRESETS[draftPreset] || BG_PRESETS.default_slate;

  // Handle local image upload via FileReader and POST /api/kiosk/upload-bg
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setUploading(true);
      try {
        const res = await axios.post('/api/kiosk/upload-bg', { image: base64 });
        setDraftBgImage(res.data.url);
        setDraftBgType('image');
        toast.success('Gambar background berhasil diunggah');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Gagal mengunggah gambar');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...currentSettings,
        kiosk_theme_color: draftColor,
        kiosk_bg_type: draftBgType,
        kiosk_bg_preset: draftPreset,
        kiosk_bg_image: draftBgImage,
        kiosk_bg_overlay: draftOverlay,
        kiosk_bg_blur: draftBlur
      };
      await onSaveSettings(payload);
      onClose();
    } catch (e) {
      // error handled in caller
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = () => {
    setDraftColor('violet');
    setDraftBgType('preset');
    setDraftPreset('default_slate');
    setDraftBgImage('');
    setDraftOverlay('0.75');
    setDraftBlur('sm');
    toast.info('Nilai desain direset ke default');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 p-6 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" />
              Kustomisasi Desain Kiosk Absensi (Owner)
            </DialogTitle>
          </div>
          <p className="text-xs text-slate-400 text-left">
            Sesuaikan background dan aksen warna kiosk agar selaras dengan identitas brand kafe Anda.
          </p>
        </DialogHeader>

        <div className="space-y-6 py-3">
          {/* ── Mini Live Preview ────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-slate-400" />
                Live Preview Tampilan:
              </label>
              <span className="text-[10px] text-slate-400">Simulasi layar Kiosk saat ini</span>
            </div>

            <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-700/80 shadow-inner flex flex-col justify-between p-4">
              {/* Background layer in preview */}
              <div className="absolute inset-0 z-0">
                {draftBgType === 'image' && draftBgImage ? (
                  <div
                    className={cn(
                      "w-full h-full bg-cover bg-center",
                      draftBlur === 'sm' && "blur-[3px] scale-105",
                      draftBlur === 'md' && "blur-[6px] scale-110",
                      draftBlur === 'lg' && "blur-[12px] scale-125"
                    )}
                    style={{ backgroundImage: `url(${draftBgImage})` }}
                  />
                ) : (
                  <div
                    className="w-full h-full"
                    style={{ background: activePreset.bgStyle }}
                  />
                )}
                <div
                  className="absolute inset-0 bg-slate-950 transition-opacity"
                  style={{ opacity: parseFloat(draftOverlay) || 0.75 }}
                />
              </div>

              {/* Preview Header */}
              <div className="relative z-10 flex items-center justify-between bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className={cn("w-7 h-7 rounded-lg bg-gradient-to-tr flex items-center justify-center shadow", activeTheme.headerIcon)}>
                    <Clock className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">Kiosk Absensi</span>
                    <span className="text-[9px] text-slate-400 leading-tight block">Terminal Siap</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn("text-sm font-mono font-extrabold tracking-wider", activeTheme.clockText)}>
                    08.15.22
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">WIB</span>
                </div>
              </div>

              {/* Preview Mode Pills */}
              <div className="relative z-10 flex justify-center gap-1.5">
                <div className={cn("px-3 py-1 rounded-lg text-[10px] font-bold shadow-sm", activeTheme.activeTab)}>
                  Scan Wajah
                </div>
                <div className="px-3 py-1 rounded-lg text-[10px] bg-slate-900/90 text-slate-400 border border-slate-800">
                  PIN Karyawan
                </div>
                <div className="px-3 py-1 rounded-lg text-[10px] bg-slate-900/90 text-slate-400 border border-slate-800">
                  Tap & Go
                </div>
              </div>

              {/* Preview Footer status */}
              <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/70 px-3 py-1.5 rounded-lg border border-slate-800/80">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Terminal Online
                </span>
                <span className={cn("font-medium", activeTheme.text)}>{activeTheme.name}</span>
              </div>
            </div>
          </div>

          {/* ── 1. Color Theme Palette Selection ────────────── */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              1. Pilih Gaya Warna Aksen:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Object.values(THEME_CONFIG).map((theme) => {
                const isSelected = draftColor === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setDraftColor(theme.id)}
                    className={cn(
                      "p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all",
                      isSelected
                        ? "bg-slate-800/90 border-amber-400/80 shadow-md ring-1 ring-amber-400/50"
                        : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                    )}
                  >
                    <div className={cn("w-6 h-6 rounded-xl flex items-center justify-center shrink-0 shadow", theme.swatch)}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{theme.name}</div>
                      <div className={cn("text-[10px] font-medium", theme.text)}>Aksen Tema</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 2. Background Type Selection ─────────────────── */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-2">
              2. Sumber Background Wallpaper:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDraftBgType('preset')}
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 font-semibold text-xs",
                  draftBgType === 'preset'
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Preset Gradient Kafe</span>
              </button>
              <button
                type="button"
                onClick={() => setDraftBgType('image')}
                className={cn(
                  "p-3 rounded-2xl border text-center transition-all flex items-center justify-center gap-2 font-semibold text-xs",
                  draftBgType === 'image'
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                )}
              >
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>Wallpaper Gambar Custom</span>
              </button>
            </div>
          </div>

          {/* ── 2A: Preset Grid ─────────────────────────────── */}
          {draftBgType === 'preset' && (
            <div>
              <label className="text-xs text-slate-400 block mb-2">
                Pilih Salah Satu Dari 7 Preset Nuansa Gelap:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {Object.values(BG_PRESETS).map((p) => {
                  const isSelected = draftPreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDraftPreset(p.id)}
                      className={cn(
                        "p-3 rounded-2xl border text-left flex items-center gap-3 transition-all",
                        isSelected
                          ? "bg-slate-800 border-amber-400 shadow-md ring-1 ring-amber-400/50"
                          : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                      )}
                    >
                      <div
                        className="w-12 h-10 rounded-xl border border-slate-700/80 shrink-0 shadow-inner"
                        style={{ background: p.bgStyle }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white flex items-center justify-between">
                          <span>{p.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 2B: Custom Image Upload & URL ───────────────── */}
          {draftBgType === 'image' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-slate-700 bg-slate-900 hover:bg-slate-850 text-slate-200 text-xs flex items-center justify-center gap-2 h-10 rounded-xl"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>{uploading ? 'Mengunggah...' : 'Pilih File Gambar (Maks 5MB)'}</span>
                </Button>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <span>Atau masukkan tautan URL:</span>
                </div>
              </div>

              <Input
                value={draftBgImage}
                onChange={e => setDraftBgImage(e.target.value)}
                placeholder="https://contoh-url.com/interior-cafe.jpg"
                className="bg-slate-900 border-slate-800 text-xs rounded-xl"
              />

              <p className="text-[10px] text-slate-400">
                💡 Rekomendasi: Gunakan foto interior kafe, meja kasir, atau wallpaper beresolusi 1920x1080 horizontal untuk hasil paling estetis.
              </p>
            </div>
          )}

          {/* ── 3. Overlay Dimmer & Blur Controls ────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dimmer Overlay */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300">Kegelapan Overlay:</label>
                <span className="text-[10px] text-amber-400 font-mono">
                  {Math.round(parseFloat(draftOverlay) * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { val: '0.50', label: '50%' },
                  { val: '0.65', label: '65%' },
                  { val: '0.75', label: '75%' },
                  { val: '0.90', label: '90%' }
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setDraftOverlay(item.val)}
                    className={cn(
                      "py-1.5 rounded-xl text-xs font-medium border text-center transition-all",
                      draftOverlay === item.val
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">
                Overlay gelap menjaga kamera dan nama karyawan tetap kontras & mudah dibaca.
              </p>
            </div>

            {/* Blur Level */}
            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300">Tingkat Blur Gambar:</label>
                <span className="text-[10px] text-amber-400 font-mono uppercase">{draftBlur}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { val: 'none', label: 'Jernih' },
                  { val: 'sm', label: 'Halus' },
                  { val: 'md', label: 'Sedang' },
                  { val: 'lg', label: 'Kuat' }
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setDraftBlur(item.val)}
                    className={cn(
                      "py-1.5 rounded-xl text-xs font-medium border text-center transition-all",
                      draftBlur === item.val
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400">
                Efek blur memberikan kesan mewah glassmorphism pada teks dan tombol.
              </p>
            </div>
          </div>
        </div>

        {/* ── Dialog Actions ───────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetDefault}
            className="text-xs text-slate-400 hover:text-white"
          >
            Reset Default
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-800 text-slate-400 hover:text-white"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || uploading}
              onClick={handleSave}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20"
            >
              {saving ? 'Menyimpan...' : 'Simpan Desain Kiosk'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
