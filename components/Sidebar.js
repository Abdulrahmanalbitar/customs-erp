'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, CreditCard, FileStack, Ship, KanbanSquare, Users, Receipt, Wallet, ArrowUpFromLine,
  UserCog, BookOpen, BarChart3, ShieldCheck, Settings, Calculator, FileSignature, History, Sparkles, X, Anchor,
} from 'lucide-react';
import { useT } from './LangProvider';

const GROUPS = (t) => [
  {
    items: [{ href: '/', label: t('الرئيسية', 'Overview'), icon: LayoutDashboard, section: 'dashboard' }],
  },
  {
    title: t('العمل', 'Work'),
    items: [
      { href: '/pos', label: t('نقطة البيع', 'Point of sale'), icon: CreditCard, section: 'pos', kbd: 'F2' },
      { href: '/declarations', label: t('المعاملات الجمركية', 'Declarations'), icon: FileStack, section: 'declarations', badge: 'declarations' },
      { href: '/board', label: t('لوحة سير العمل', 'Workflow board'), icon: KanbanSquare, section: 'board' },
      { href: '/shipments', label: t('تتبع الشحنات', 'Shipments'), icon: Ship, section: 'shipments', badge: 'shipments' },
      { href: '/clients', label: t('العملاء', 'Clients'), icon: Users, section: 'clients' },
      { href: '/calculator', label: t('حاسبة الرسوم', 'Duty calculator'), icon: Calculator, section: 'calculator' },
    ],
  },
  {
    title: t('المالية', 'Finance'),
    items: [
      { href: '/quotes', label: t('عروض الأسعار', 'Quotations'), icon: FileSignature, section: 'quotes' },
      { href: '/invoices', label: t('الفواتير', 'Invoices'), icon: Receipt, section: 'invoices', badge: 'invoices' },
      { href: '/payments', label: t('سندات القبض', 'Receipts'), icon: Wallet, section: 'payments' },
      { href: '/expenses', label: t('المصاريف', 'Expenses'), icon: ArrowUpFromLine, section: 'expenses' },
      { href: '/accounting', label: t('المحاسبة والقيود', 'Accounting'), icon: BookOpen, section: 'accounting' },
    ],
  },
  {
    title: t('التحليل', 'Insights'),
    items: [
      { href: '/assistant', label: t('المساعد الذكي', 'AI assistant'), icon: Sparkles, section: 'ai', ai: true },
      { href: '/reports', label: t('التقارير', 'Reports'), icon: BarChart3, section: 'reports' },
    ],
  },
  {
    title: t('الإدارة', 'Admin'),
    items: [
      { href: '/employees', label: t('الموظفون والرواتب', 'Staff & payroll'), icon: UserCog, section: 'employees' },
      { href: '/users', label: t('المستخدمون والصلاحيات', 'Users & roles'), icon: ShieldCheck, section: 'users' },
      { href: '/activity', label: t('سجل النشاط', 'Audit log'), icon: History, section: 'activity' },
      { href: '/settings', label: t('الإعدادات', 'Settings'), icon: Settings, section: 'settings' },
    ],
  },
];

export default function Sidebar({ allowed, officeName, open, onClose, badges = {} }) {
  const path = usePathname();
  const { t } = useT();
  const active = (href) => (href === '/' ? path === '/' : path.startsWith(href));

  return (
    <>
      <aside
        className={`no-print fixed inset-y-0 start-0 z-50 flex w-[264px] flex-col border-e border-slate-200/80 bg-white transition-transform duration-300 dark:border-white/5 dark:bg-ink-800 lg:!translate-x-0 ${
          open ? 'translate-x-0' : 'max-lg:hidden'
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-onbrand shadow-glow dark:bg-brand-500">
            <Anchor className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[15px] font-bold text-slate-900 dark:text-white">{officeName}</div>
            <span className="mt-0.5 inline-block rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              {t('تخليص جمركي', 'Customs clearance')}
            </span>
          </div>
          <button className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 lg:hidden" onClick={onClose} aria-label={t('إغلاق', 'Close')}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {GROUPS(t).map((g, gi) => {
            const items = g.items.filter((i) => allowed.includes(i.section));
            if (!items.length) return null;
            return (
              <div key={gi} className={gi ? 'mt-3 border-t border-slate-100 pt-3 dark:border-white/5' : ''}>
                {g.title && <div className="mb-1 px-3 text-[11.5px] font-medium text-slate-400">{g.title}</div>}
                {items.map((i) => {
                  const Icon = i.icon;
                  const on = active(i.href);
                  const b = i.badge ? badges[i.badge] : null;
                  return (
                    <Link
                      key={i.href}
                      href={i.href}
                      onClick={onClose}
                      className={`mb-0.5 flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] transition-colors duration-150 ${
                        on
                          ? 'bg-brand-50 font-semibold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                      }`}
                    >
                      <Icon className={`h-[19px] w-[19px] ${i.ai ? 'text-brand-500' : on ? '' : 'text-slate-400'}`} strokeWidth={1.8} />
                      <span className="flex-1">{i.label}</span>
                      {i.kbd && <kbd className="rounded border border-slate-200 px-1 font-mono text-[10px] text-slate-400 dark:border-white/10">{i.kbd}</kbd>}
                      {b && b.count > 0 && (
                        <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${b.tone === 'red' ? 'bg-red-500' : 'bg-brand-600 dark:bg-brand-500 dark:text-onbrand'}`}>{b.count}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400 dark:border-white/5">v0.2 · {t('سوريا', 'Syria')}</div>
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={onClose} />}
    </>
  );
}
