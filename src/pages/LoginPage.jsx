import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function LoginPage() {
  const [form, setForm] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      email: params.get('email') || '',
      password: params.get('password') || '',
    };
  });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [isDemo, setIsDemo] = useState(false);
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  // Sync if URL search params change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    const pwParam = params.get('password');
    if (emailParam || pwParam) {
      setForm(f => ({
        email: emailParam || f.email,
        password: pwParam || f.password,
      }));
    }
  }, []);

  const [cafeName, setCafeName] = useState(() => sessionStorage.getItem('admin_cafe_name') || '');

  // Check cafe name and demo mode
  useEffect(() => {
    fetch('/api/settings/cafe_name')
      .then(r => r.json())
      .then(d => {
        const val = d?.value || d?.setting?.setting_value;
        if (val) {
          setCafeName(val);
          sessionStorage.setItem('admin_cafe_name', val);
        }
      })
      .catch(() => {});

    fetch('/api/settings/is_demo_tenant')
      .then(r => r.json())
      .then(d => {
        const val = d?.value || d?.setting?.setting_value;
        if (val === 'true' || val === true) {
          setIsDemo(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const res = await login(form.email, form.password);
    if (res.ok) navigate('/');
    else setError(res.error);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #2C1810 0%, #6F4E37 40%, #8B4513 70%, #D4A574 100%)',
      }}
    >
      {/* Background coffee rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-white/10"
            style={{
              width: `${150 + i * 80}px`,
              height: `${150 + i * 80}px`,
              top: `${10 + i * 8}%`,
              left: `${-5 + i * 12}%`,
              opacity: 0.15 - i * 0.015,
            }}
          />
        ))}
        <div className="absolute top-1/4 right-10 w-64 h-64 rounded-full bg-cafe-accent/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-80 h-80 rounded-full bg-cafe-dark/20 blur-3xl" />
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-xl">
            <Coffee className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white font-cafe">{cafeName || 'Café'}</h1>
          <p className="text-white/60 text-sm mt-1">Admin Panel</p>
        </div>

        {/* Form card */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-5">Masuk ke Dashboard</h2>

          {error && (
            <div className="bg-red-500/20 border border-red-400/40 text-red-200 text-sm rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-white/70 text-xs font-medium mb-1.5 block uppercase tracking-wide">
                Email
              </label>
              <Input
                type="text"
                placeholder="Email atau No. HP"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-white/30 focus-visible:border-white/40"
              />
            </div>

            <div>
              <label className="text-white/70 text-xs font-medium mb-1.5 block uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus-visible:ring-white/30 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cafe-accent hover:bg-cafe-accent/90 text-cafe-dark font-semibold h-10 mt-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? 'Masuk...' : 'Masuk'}
            </Button>
          </form>

          {isDemo && (
            <div className="mt-4 pt-3 border-t border-white/20">
              <p className="text-[11px] text-white/80 mb-2 font-medium flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Mode Demo Aktif &mdash; Klik untuk isi akun:
              </p>
              <div className="grid grid-cols-5 gap-1 text-[11px]">
                {(() => {
                  const slug = window.location.hostname.replace('office-', '').split('.')[0] || 'demo-cafe-baru';
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setForm({ email: `owner@${slug}.id`, password: 'demo1234' })}
                        className="px-1.5 py-1.5 bg-white/15 hover:bg-white/25 text-white font-medium rounded text-center transition-colors border border-white/20 active:scale-95 truncate"
                        title="Owner / Admin"
                      >
                        Owner
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ email: `kasir@${slug}.id`, password: 'demo1234' })}
                        className="px-1.5 py-1.5 bg-white/15 hover:bg-white/25 text-white font-medium rounded text-center transition-colors border border-white/20 active:scale-95 truncate"
                        title="Kasir"
                      >
                        Kasir
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ email: `waiter@${slug}.id`, password: 'demo1234' })}
                        className="px-1.5 py-1.5 bg-white/15 hover:bg-white/25 text-white font-medium rounded text-center transition-colors border border-white/20 active:scale-95 truncate"
                        title="Waiter"
                      >
                        Waiter
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ email: `dapur@${slug}.id`, password: 'demo1234' })}
                        className="px-1.5 py-1.5 bg-white/15 hover:bg-white/25 text-white font-medium rounded text-center transition-colors border border-white/20 active:scale-95 truncate"
                        title="Dapur (Kitchen Display)"
                      >
                        Dapur
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm({ email: `bar@${slug}.id`, password: 'demo1234' })}
                        className="px-1.5 py-1.5 bg-white/15 hover:bg-white/25 text-white font-medium rounded text-center transition-colors border border-white/20 active:scale-95 truncate"
                        title="Bar (Bar Display)"
                      >
                        Bar
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <p className="text-center text-white/40 text-xs mt-5">
            {cafeName || 'Café'} &copy; {new Date().getFullYear()} &mdash; Admin &amp; Kasir Only
          </p>
        </div>
      </div>
    </div>
  );
}
