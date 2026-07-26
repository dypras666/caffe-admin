import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers, Check, Lock, Star, ExternalLink, Crown, Zap, Coffee,
  RefreshCw, ShoppingCart, X, AlertCircle,
} from 'lucide-react';
import { useToast } from '../components/ui/toast';
import registryApi from '../lib/registryApi';

const TIER_META = {
  free:      { label: 'Free',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',   icon: Coffee },
  premium:   { label: 'Premium',   color: 'bg-amber-100  text-amber-700  border-amber-200',       icon: Crown },
  exclusive: { label: 'Exclusive', color: 'bg-violet-100 text-violet-700 border-violet-200',      icon: Zap },
};

export default function TemplatePage() {
  const { add: toast } = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(null);
  const [activating, setActivating] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { tpl, action: 'buy'|'activate' }

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await registryApi.get('/templates');
      setTemplates(data.templates || []);
    } catch (e) {
      toast(e.response?.data?.error || 'Gagal memuat template', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleBuy = async (tpl) => {
    setPurchasing(tpl.id);
    setConfirmModal(null);
    try {
      const { data } = await registryApi.post(`/templates/${tpl.id}/purchase`);
      toast(data.message || `Template "${tpl.name}" berhasil dibeli`, 'success');
      setTemplates(prev => prev.map(t => t.id === tpl.id ? { ...t, owned: true } : t));
    } catch (e) {
      toast(e.response?.data?.error || 'Gagal membeli template', 'error');
    } finally {
      setPurchasing(null);
    }
  };

  const handleActivate = async (tpl) => {
    setActivating(tpl.id);
    setConfirmModal(null);
    try {
      const { data } = await registryApi.post(`/templates/${tpl.id}/activate`);
      toast(data.message || `Template "${tpl.name}" diaktifkan`, 'success');
      setTemplates(prev => prev.map(t => ({
        ...t,
        is_active_for_tenant: t.id === tpl.id,
      })));
    } catch (e) {
      toast(e.response?.data?.error || 'Gagal mengaktifkan template', 'error');
    } finally {
      setActivating(null);
    }
  };

  const activeTemplate = templates.find(t => t.is_active_for_tenant);

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-600" />
            Template Tampilan
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pilih dan aktifkan template landing page untuk café kamu. Aktivasi akan mengganti container UI secara otomatis.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Active banner */}
      {activeTemplate && (
        <div className="mb-6 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">Template Aktif: {activeTemplate.name}</p>
            <p className="text-xs text-amber-600">Docker image: <code className="font-mono bg-amber-100 px-1 rounded">{activeTemplate.image_tag || 'cafe-ui:latest'}</code></p>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white overflow-hidden animate-pulse">
              <div className="h-44 bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-2/3" />
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((tpl, i) => {
            const tier = TIER_META[tpl.tier] || TIER_META.free;
            const TierIcon = tier.icon;
            const isBuying = purchasing === tpl.id;
            const isActivating = activating === tpl.id;
            const canUse = tpl.owned || tpl.price === 0;

            return (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`bg-white rounded-2xl border overflow-hidden flex flex-col transition-shadow hover:shadow-md ${
                  tpl.is_active_for_tenant
                    ? 'border-amber-400 ring-2 ring-amber-200'
                    : 'border-gray-100'
                }`}
              >
                {/* Thumbnail */}
                <div
                  className="relative h-44 flex items-center justify-center overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, hsl(${tpl.preview_hue || 30}, 45%, 22%) 0%, hsl(${tpl.preview_hue || 30}, 38%, 38%) 100%)`,
                  }}
                >
                  {tpl.thumbnail_url
                    ? <img src={tpl.thumbnail_url} alt={tpl.name} className="w-full h-full object-cover" />
                    : <Coffee className="w-12 h-12 text-white/30" />
                  }
                  {tpl.preview_url && (
                    <a
                      href={tpl.preview_url}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-2 right-2 flex items-center gap-1 text-xs font-semibold bg-white/90 text-gray-700 px-2.5 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" /> Preview
                    </a>
                  )}
                  {tpl.is_active_for_tenant && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Aktif
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{tpl.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tpl.description}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${tier.color}`}>
                      <TierIcon className="w-3 h-3" /> {tier.label}
                    </span>
                  </div>

                  {/* Docker image tag */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Layers className="w-3 h-3" />
                    <code className="font-mono text-gray-500">{tpl.image_tag || 'cafe-ui:latest'}</code>
                  </div>

                  {/* Tags */}
                  {tpl.tags && (
                    <div className="flex flex-wrap gap-1">
                      {tpl.tags.split(',').map(tag => (
                        <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                          {tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rating */}
                  {tpl.rating > 0 && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {Number(tpl.rating).toFixed(1)}
                      {tpl.review_count > 0 && (
                        <span className="text-gray-400 font-normal">({tpl.review_count})</span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                    <div className="text-sm font-bold text-gray-800">
                      {tpl.price === 0
                        ? <span className="text-emerald-600">Gratis</span>
                        : `Rp ${Number(tpl.price).toLocaleString('id-ID')}`
                      }
                    </div>

                    <div className="flex gap-2">
                      {/* Preview link */}
                      {tpl.preview_url && (
                        <a
                          href={tpl.preview_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-gray-500 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:border-gray-300 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" /> Preview
                        </a>
                      )}

                      {tpl.is_active_for_tenant ? (
                        <button disabled className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg cursor-default">
                          <Check className="w-3.5 h-3.5" /> Aktif
                        </button>
                      ) : canUse ? (
                        <button
                          onClick={() => setConfirmModal({ tpl, action: 'activate' })}
                          disabled={isActivating}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                        >
                          {isActivating
                            ? <><Spinner /> Mengaktifkan...</>
                            : <><Check className="w-3.5 h-3.5" /> Aktifkan</>
                          }
                        </button>
                      ) : (
                        <button
                          onClick={() => setConfirmModal({ tpl, action: 'buy' })}
                          disabled={isBuying}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-900 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                        >
                          {isBuying
                            ? <><Spinner /> Proses...</>
                            : <><ShoppingCart className="w-3.5 h-3.5" /> Beli</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setConfirmModal(null)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    confirmModal.action === 'activate' ? 'bg-amber-100' : 'bg-gray-100'
                  }`}>
                    {confirmModal.action === 'activate'
                      ? <Check className="w-5 h-5 text-amber-600" />
                      : <ShoppingCart className="w-5 h-5 text-gray-600" />
                    }
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {confirmModal.action === 'activate' ? 'Aktifkan Template' : 'Beli Template'}
                    </h3>
                    <p className="text-xs text-gray-500">{confirmModal.tpl.name}</p>
                  </div>
                </div>
                <button onClick={() => setConfirmModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {confirmModal.action === 'activate' ? (
                <div className="text-sm text-gray-600 space-y-2 mb-5">
                  <p>Mengaktifkan template ini akan <strong>me-restart container UI</strong> café kamu dengan Docker image:</p>
                  <code className="block bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 font-mono text-xs text-gray-700">
                    {confirmModal.tpl.image_tag || 'cafe-ui:latest'}
                  </code>
                  <p className="flex items-start gap-1.5 text-amber-600 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    Website café akan mengalami downtime singkat (~5 detik) selama proses swap container.
                  </p>
                </div>
              ) : (
                <div className="text-sm text-gray-600 space-y-2 mb-5">
                  <p>Kamu akan membeli template <strong>{confirmModal.tpl.name}</strong> seharga:</p>
                  <p className="text-2xl font-bold text-gray-900">
                    Rp {Number(confirmModal.tpl.price).toLocaleString('id-ID')}
                  </p>
                  <p className="text-xs text-gray-500">Dibayar dari saldo akun registry kamu.</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl py-2 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={() =>
                    confirmModal.action === 'activate'
                      ? handleActivate(confirmModal.tpl)
                      : handleBuy(confirmModal.tpl)
                  }
                  className={`flex-1 text-sm font-semibold text-white rounded-xl py-2 transition-colors ${
                    confirmModal.action === 'activate'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-gray-900 hover:bg-gray-700'
                  }`}
                >
                  {confirmModal.action === 'activate' ? 'Ya, Aktifkan' : 'Ya, Beli Sekarang'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}
