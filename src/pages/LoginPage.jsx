import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

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
          <h1 className="text-3xl font-bold text-white font-cafe">Café Azzura</h1>
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

          <p className="text-center text-white/40 text-xs mt-5">
            Café Azzura &copy; 2026 &mdash; Admin &amp; Kasir Only
          </p>
        </div>
      </div>
    </div>
  );
}
