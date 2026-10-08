import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { buildNavGroups } from './layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useApi';
import { Dialog, DialogContent } from './ui/dialog';
import { cn } from '../lib/utils';

export default function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Fetch settings for buildNavGroups
  const { data: settingsData } = useFetch('/settings');
  const settings = settingsData || {};

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const groups = buildNavGroups(settings);
  
  // Flatten items and filter by roles
  const allItems = groups.flatMap(g => g.items || []).filter(item => {
    if (item.adminOnly && user?.role !== 'admin') return false;
    if (item.roles && user?.role && !item.roles.includes(user.role)) return false;
    return true;
  });

  const filteredItems = search
    ? allItems.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
    : allItems;

  useEffect(() => {
    setSelectedIndex(0);
  }, [search, open]);

  const handleSelect = (item) => {
    if (!item) return;
    setOpen(false);
    setSearch('');
    if (item.external) {
      window.open(item.to, '_blank');
    } else {
      navigate(item.to);
    }
  };

  return (
    <>
      <button 
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 hover:bg-muted px-3 py-1.5 rounded-lg border transition-colors md:w-64"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline">Cari menu...</span>
        <span className="md:hidden">Cari...</span>
        <kbd className="hidden md:inline-flex items-center gap-1 bg-background border px-1.5 rounded text-[10px] font-medium ml-auto">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 gap-0 overflow-hidden bg-card border-none shadow-2xl rounded-xl">
          <div className="flex items-center px-4 py-3 border-b">
            <Search className="w-5 h-5 text-muted-foreground mr-2 shrink-0" />
            <input
              autoFocus
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground text-sm"
              placeholder="Ketik untuk mencari menu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setSelectedIndex(s => Math.min(s + 1, filteredItems.length - 1));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setSelectedIndex(s => Math.max(s - 1, 0));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredItems[selectedIndex]) {
                    handleSelect(filteredItems[selectedIndex]);
                  }
                }
              }}
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2">
            {filteredItems.length === 0 ? (
              <p className="p-4 text-sm text-center text-muted-foreground">Tidak ada hasil yang ditemukan.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {filteredItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors group",
                      selectedIndex === i ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground"
                    )}
                  >
                    <div className={cn(
                      "border rounded p-1 transition-colors",
                      selectedIndex === i ? "bg-primary-foreground/20 border-primary-foreground/20" : "bg-background group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary"
                    )}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
