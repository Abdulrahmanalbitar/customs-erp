import { redirect } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { getUser, destroySession } from '@/lib/auth';
import { db } from '@/lib/db';
import { ACCESS, ROLES, OPEN_STATUSES } from '@/lib/constants';
import { getSettings } from '@/lib/settings';
import { getAlerts } from '@/lib/alerts';
import { aiEnabled } from '@/lib/ai';
import { getT } from '@/lib/i18n';

const ROLES_EN = { ADMIN: 'Owner', ACCOUNTANT: 'Accountant', BROKER: 'Clearance agent', CASHIER: 'Cashier' };

async function logout() {
  'use server';
  destroySession();
  redirect('/login');
}

export default async function AppLayout({ children }) {
  const user = await getUser();
  if (!user) redirect('/login');
  const { lang } = await getT();
  const [settings, alerts, openDecl, lateShips, overdue] = await Promise.all([
    getSettings(),
    getAlerts(),
    db.declaration.count({ where: { status: { in: OPEN_STATUSES } } }),
    db.shipment.count({ where: { status: { in: ['BOOKED', 'LOADED', 'DEPARTED', 'IN_TRANSIT', 'TRANSSHIPMENT', 'DELAYED'] }, eta: { lt: new Date() } } }),
    db.invoice.count({ where: { status: { in: ['UNPAID', 'PARTIAL'] }, createdAt: { lt: new Date(Date.now() - 30 * 864e5) } } }),
  ]);
  const allowed = Object.keys(ACCESS).filter((k) => ACCESS[k].includes(user.role));
  return (
    <AppShell
      allowed={allowed}
      officeName={settings.officeName}
      user={user.name}
      username={user.username}
      roleLabel={lang === 'en' ? ROLES_EN[user.role] : ROLES[user.role]}
      alerts={alerts.map((a) => ({ ...a, at: a.at ? String(a.at) : null }))}
      badges={{
        declarations: { count: openDecl, tone: 'blue' },
        shipments: { count: lateShips, tone: 'red' },
        invoices: { count: overdue, tone: 'red' },
      }}
      logout={logout}
      aiEnabled={aiEnabled()}
    >
      {children}
    </AppShell>
  );
}
