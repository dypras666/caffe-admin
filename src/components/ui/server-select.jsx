/**
 * ServerSelect — searchable select with server-side data loading.
 * Drops down a fixed-positioned list to avoid overflow-clip issues.
 *
 * Props:
 *   endpoint      string   — API path, e.g. '/products' (will append ?q=...&limit=20)
 *   value         string   — selected item id (string)
 *   onChange      fn(item) — called with full item object when selected
 *   onClear       fn()     — called when cleared
 *   displayValue  string   — text to show when selected (e.g. item.name)
 *   placeholder   string   — input placeholder
 *   renderOption  fn(item) — optional custom row renderer
 *   searchParam   string   — query param name (default 'search')
 *   labelKey      string   — field to display (default 'name')
 *   minChars      number   — min chars before searching (default 0 = load on focus)
 *   extraParams   string   — additional query string e.g. '&status=active'
 *   disabled      bool
 *   className     string
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { useDebounce } from '../../hooks/useApi';
import api from '../../lib/api';
import { Search, X, Loader2, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export function ServerSelect({
  endpoint,
  value,
  onChange,
  onClear,
  displayValue = '',
  placeholder = 'Ketik untuk mencari...',
  renderOption,
  searchParam = 'search',
  labelKey = 'name',
  minChars = 0,
  extraParams = '',
  disabled = false,
  className = '',
  resultKey, // key in response, e.g. 'products', 'ingredients'; auto-detected if not set
}) {
  const [q, setQ] = useState('');
  const [show, setShow] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rect, setRect] = useState(null);
  const inputRef = useRef(null);
  const debouncedQ = useDebounce(q, 280);

  // Fetch from server
  const fetchResults = useCallback(async (query) => {
    if (!endpoint) return;
    if (query.length < minChars && minChars > 0) { setResults([]); return; }
    setLoading(true);
    try {
      const qs = query
        ? `?${searchParam}=${encodeURIComponent(query)}&limit=20${extraParams}`
        : `?limit=20${extraParams}`;
      const res = await api.get(`${endpoint}${qs}`);
      // Auto-detect result key from response
      const data = res.data;
      let items = [];
      if (resultKey && data[resultKey]) {
        items = data[resultKey];
      } else {
        // Try common keys
        const key = Object.keys(data).find(k =>
          Array.isArray(data[k]) && !['pagination'].includes(k)
        );
        items = key ? data[key] : [];
      }
      setResults(items);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, [endpoint, searchParam, extraParams, resultKey, minChars]);

  useEffect(() => {
    if (show) fetchResults(debouncedQ);
  }, [debouncedQ, show, fetchResults]);

  const openDropdown = () => {
    if (disabled) return;
    if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    setShow(true);
    fetchResults(q);
  };

  const selectItem = (item) => {
    onChange(item);
    setQ('');
    setShow(false);
  };

  const clear = (e) => {
    e.stopPropagation();
    onClear?.();
    setQ('');
    setShow(false);
  };

  // Close on outside click
  useEffect(() => {
    if (!show) return;
    const handler = (e) => {
      if (!inputRef.current?.contains(e.target)) setShow(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);

  // Update rect on scroll/resize
  useEffect(() => {
    if (!show) return;
    const update = () => {
      if (inputRef.current) setRect(inputRef.current.getBoundingClientRect());
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [show]);

  const isSelected = !!value;

  return (
    <div ref={inputRef} className={cn('relative', className)}>
      {/* Trigger */}
      <div
        onClick={openDropdown}
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-lg border cursor-pointer text-sm transition-colors',
          disabled ? 'bg-muted cursor-not-allowed opacity-60' : 'bg-background hover:border-primary/40',
          isSelected && !show ? 'border-primary/40 bg-primary/5' : 'border-input',
          show && 'border-primary ring-1 ring-primary'
        )}
      >
        {show ? (
          // Search mode
          <>
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent outline-none text-sm min-w-0"
              onFocus={() => { if (inputRef.current) setRect(inputRef.current.getBoundingClientRect()); }}
              onClick={e => e.stopPropagation()}
            />
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground shrink-0" />}
          </>
        ) : isSelected ? (
          // Selected state
          <>
            <span className="flex-1 truncate font-medium text-foreground">{displayValue}</span>
            <button type="button" onClick={clear} className="text-muted-foreground hover:text-foreground shrink-0 p-0.5 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          // Empty state
          <>
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="flex-1 text-muted-foreground truncate">{placeholder}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          </>
        )}
      </div>

      {/* Dropdown — fixed position to escape overflow clip */}
      {show && rect && (
        <div
          className="fixed z-[9999] bg-card border rounded-xl shadow-2xl overflow-hidden"
          style={{ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 260) }}
          onMouseDown={e => e.preventDefault()} // prevent blur
        >
          <div className="max-h-52 overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-4 py-3 text-xs text-muted-foreground text-center">
                {loading ? 'Memuat...' : debouncedQ ? `"${debouncedQ}" tidak ditemukan` : 'Ketik untuk mencari...'}
              </p>
            ) : results.map((item, i) => (
              <button
                key={item.id ?? i}
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-secondary transition-colors text-sm"
                onMouseDown={() => selectItem(item)}
              >
                {renderOption ? renderOption(item) : (
                  <span>{item[labelKey] || item.name || String(item.id)}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
