'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Menu, Search, Bell, Sparkles, LogOut, Ship, TriangleAlert, FileWarning, Wallet, Flag, X, Palette, Check,
  CreditCard, UserPlus, FilePlus2, Receipt, Calculator, PackagePlus, CornerDownLeft,
} from 'lucide-react';
import Sidebar from './Sidebar';
import AiChat from './AiChat';
import { useT, setLang } from './LangProvider';

const ALERT_ICONS = { ship: Ship, alert: TriangleAlert, file: FileWarning, money: Wallet, flag: Flag };
const ALERT_TONE = {
  info: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
  danger: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300',
};
const THEMES = (t) => [
  ['system', t('حسب النظام', 'System')],
  ['light', t('فاتح', 'Light')],
  ['dark', t('داكن', 'Dark')],
  ['royal', t('ملكي (كحلي وذهبي)', 'Royal (navy & gold)')],
  ['blueprint', t('مخطط هندسي', 'Blueprint')],
];

export function applyTheme(theme) {
  const d = document.documentElement;
  const dark = ['dark', 'royal', 'blueprint'].includes(theme) || (theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  d.classList.toggle('dark', dark);
  if (theme === 'royal' || theme === 'blueprint') d.dataset.theme = theme;
  else delete d.dataset.theme;
  try { localStorage.setItem('theme', theme); } catch {}
}

export default function AppShell({ children, allowed, officeName, user, username, roleLabel, alerts, logout, aiEnabled, badges }) {
  const router = useRouter();
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(null); // 'bell' | 'theme'
  const [palette, setPalette] = useState(false);
  const [ai, setAi] = useState(false);
  const [theme, setTheme] = useState('system');

  useEffect(() => {
    try { setTheme(localStorage.getItem('theme') || 'system'); } catch {}
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); }
      if (e.key === 'F2' && allowed.includes('pos')) { e.preventDefault(); router.push('/pos'); }
      if (e.key === 'Escape') { setPalette(false); setMenu(null); setAi(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [allowed, router]);

  const pickTheme = (k) => { setTheme(k); applyTheme(k); setMenu(null); };

  return (
    <div className="min-h-screen">
      <Sidebar allowed={allowed} officeName={officeName} open={open} onClose={() => setOpen(false)} badges={badges} />
      <div className="lg:ms-[264px]">
        <header className="no-print sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/5 dark:bg-ink-900/75">
          <div className="flex h-16 items-center gap-2 px-4 lg:px-8">
            <button className="btn-ghost p-2 lg:hidden" onClick={() => setOpen(true)} aria-label={t('القائمة', 'Menu')}><Menu className="h-5 w-5" /></button>
            <button
              onClick={() => setPalette(true)}
              className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-400 transition hover:border-brand-300 dark:border-white/10 dark:bg-white/5 md:max-w-xl"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-start">{t('ابحث أو نفّذ أمراً...', 'Search or run a command…')}</span>
              <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:border-white/10 dark:bg-white/5 sm:block">Ctrl K</kbd>
            </button>
            <div className="ms-auto flex shrink-0 items-center gap-1">
              <div className="relative">
                <button onClick={() => setMenu(menu === 'bell' ? null : 'bell')} className="btn-ghost relative h-10 w-10 p-0" aria-label={t('التنبيهات', 'Notifications')}>
                  <Bell className="h-5 w-5" />
                  {alerts.length > 0 && <span className="absolute end-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{alerts.length}</span>}
                </button>
                {menu === 'bell' && (
                  <div className="absolute end-0 top-12 w-[22rem] max-w-[calc(100vw-2rem)] animate-pop overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-800">
                    <div className="flex items-center justify-between border-b px-4 py-3 dark:border-white/5">
                      <b className="text-sm">{t('تنبيهات تحتاج قرارك', 'Alerts that need you')}</b>
                      <span className="text-xs text-slate-400">{alerts.length}</span>
                    </div>
                    <div className="max-h-96 overflow-y-auto p-2">
                      {alerts.map((a, i) => {
                        const Icon = ALERT_ICONS[a.icon] || Bell;
                        return (
                          <Link key={i} href={a.href} onClick={() => setMenu(null)} className="flex gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5">
                            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${ALERT_TONE[a.level]}`}><Icon className="h-4 w-4" /></span>
                            <span className="min-w-0"><span className="block text-sm font-semibold">{a.title}</span><span className="block truncate text-xs text-slate-500">{a.text}</span></span>
                          </Link>
                        );
                      })}
                      {!alerts.length && <div className="p-8 text-center text-sm text-slate-400">{t('لا توجد تنبيهات', 'All clear')}</div>}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button onClick={() => setMenu(menu === 'theme' ? null : 'theme')} className="btn-ghost h-10 w-10 p-0" aria-label={t('المظهر', 'Theme')}><Palette className="h-5 w-5" /></button>
                {menu === 'theme' && (
                  <div className="absolute end-0 top-12 w-60 animate-pop rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-white/10 dark:bg-ink-800">
                    {THEMES(t).map(([k, l]) => (
                      <button key={k} onClick={() => pickTheme(k)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                        <span className={`h-4 w-4 rounded-full border ${k === 'royal' ? 'border-[#c9a45c] bg-[#0f1c33]' : k === 'blueprint' ? 'border-[#2e9bff] bg-[#0b1c3f]' : k === 'dark' ? 'bg-[#171b21]' : k === 'light' ? 'bg-white' : 'bg-gradient-to-r from-white to-[#171b21]'}`} />
                        <span className="flex-1 text-start">{l}</span>
                        {theme === k && <Check className="h-4 w-4 text-brand-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} className="h-10 rounded-full border border-slate-200 px-3 text-sm font-semibold hover:border-brand-300 dark:border-white/10">
                {lang === 'ar' ? 'EN' : 'ع'}
              </button>
              <div className="ms-1 hidden items-center gap-2.5 sm:flex">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">{user.slice(0, 1)}</div>
                <div className="leading-tight">
                  <div className="text-sm font-semibold">{user}</div>
                  <div className="text-[11px] text-slate-500"><bdi>{username}</bdi> · {roleLabel}</div>
                </div>
              </div>
              <form action={logout}><button className="btn-ghost h-10 w-10 p-0" title={t('تسجيل الخروج', 'Sign out')} aria-label={t('تسجيل الخروج', 'Sign out')}><LogOut className="h-5 w-5 rtl:-scale-x-100" /></button></form>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1600px] p-4 lg:p-8">{children}</main>
      </div>

      {allowed.includes('ai') && !ai && (
        <button onClick={() => setAi(true)} className="no-print fixed bottom-6 end-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-l from-brand-500 to-brand-800 px-5 py-3.5 font-semibold text-onbrand shadow-lift ring-8 ring-brand-500/10 transition hover:-translate-y-0.5">
          <Sparkles className="h-5 w-5" /><span className="hidden sm:inline">{t('المساعد', 'Assistant')}</span>
        </button>
      )}
      {palette && <CommandPalette onClose={() => setPalette(false)} allowed={allowed} />}
      {ai && (
        <div className="no-print fixed inset-0 z-[60] flex justify-end bg-black/30 backdrop-blur-[2px]" onClick={() => setAi(false)}>
          <div className="m-0 flex h-full w-full max-w-md animate-pop flex-col overflow-hidden bg-white shadow-2xl dark:bg-ink-800 sm:m-4 sm:h-[calc(100%-2rem)] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4 dark:border-white/5">
              <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/15"><Sparkles className="h-4 w-4" /></span><b>{t('المساعد الذكي', 'AI assistant')}</b></div>
              <button className="btn-ghost p-2" onClick={() => setAi(false)}><X className="h-5 w-5" /></button>
            </div>
            <AiChat compact enabled={aiEnabled} />
          </div>
        </div>
      )}
    </div>
  );
}

function CommandPalette({ onClose, allowed }) {
  const router = useRouter();
  const { t } = useT();
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [idx, setIdx] = useState(0);

  const actions = useMemo(() => [
    { s: 'pos', title: t('بيع جديد', 'New sale'), href: '/pos', icon: CreditCard, kbd: 'F2' },
    { s: 'declarations', title: t('معاملة جمركية جديدة', 'New declaration'), href: '/declarations/new', icon: FilePlus2 },
    { s: 'shipments', title: t('شحنة جديدة', 'New shipment'), href: '/shipments/new', icon: PackagePlus },
    { s: 'clients', title: t('عميل جديد', 'New client'), href: '/clients/new', icon: UserPlus },
    { s: 'invoices', title: t('فاتورة جديدة', 'New invoice'), href: '/invoices/new', icon: Receipt },
    { s: 'calculator', title: t('حاسبة الرسوم', 'Duty calculator'), href: '/calculator', icon: Calculator },
    { s: 'ai', title: t('اسأل المساعد الذكي', 'Ask the assistant'), href: '/assistant', icon: Sparkles },
  ].filter((a) => allowed.includes(a.s)).map((a) => ({ ...a, type: t('إجراء', 'Action') })), [allowed, t]);

  useEffect(() => {
    if (!q.trim()) { setRes([]); return; }
    const c = new AbortController();
    const tm = setTimeout(async () => {
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: c.signal });
        if (r.ok) { setRes(await r.json()); setIdx(0); }
      } catch {}
    }, 160);
    return () => { clearTimeout(tm); c.abort(); };
  }, [q]);

  const list = q.trim() ? [...actions.filter((a) => a.title.includes(q)), ...res] : actions;
  const go = (item) => { onClose(); router.push(item.href); };

  return (
    <div className="no-print fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl animate-pop overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-800" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b px-4 dark:border-white/5">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx((i) => Math.min(i + 1, list.length - 1)); }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              if (e.key === 'Enter' && list[idx]) go(list[idx]);
            }}
            placeholder={t('اسم عميل، رقم معاملة، حاوية، رقم تتبع، أو أمر...', 'Client, declaration, container, tracking no. or a command…')}
            className="h-14 flex-1 bg-transparent text-base outline-none"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          {!q && <div className="px-3 pb-1 pt-2 text-[11.5px] font-medium text-slate-400">{t('إجراءات سريعة', 'Quick actions')}</div>}
          {list.map((r, i) => {
            const Icon = r.icon;
            return (
              <button key={r.href + i} onClick={() => go(r)} onMouseEnter={() => setIdx(i)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start ${i === idx ? 'bg-brand-50 dark:bg-white/10' : ''}`}>
                {Icon ? <Icon className="h-4 w-4 text-brand-600" /> : <span className="chip">{r.type}</span>}
                <span className="flex-1 truncate text-sm font-semibold">{r.title}</span>
                {r.kbd && <kbd className="chip">{r.kbd}</kbd>}
                {r.sub && <span className="truncate text-xs text-slate-400">{r.sub}</span>}
              </button>
            );
          })}
          {q && !list.length && <div className="p-6 text-center text-sm text-slate-400">{t('لا نتائج', 'No results')}</div>}
        </div>
        <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] text-slate-400 dark:border-white/5">
          <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> {t('فتح', 'open')}</span>
          <span>↑↓ {t('تنقل', 'navigate')}</span><span>Esc {t('إغلاق', 'close')}</span>
        </div>
      </div>
    </div>
  );
}
