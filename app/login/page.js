import Link from 'next/link';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import { Anchor, Ship, Sparkles, ShieldCheck, MapPin } from 'lucide-react';
import { db } from '@/lib/db';
import { createSession, getUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import OceanHero from '@/components/OceanHero';

async function login(formData) {
  'use server';
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '');
  const user = await db.user.findUnique({ where: { username } });
  if (!user || !user.active || !(await bcrypt.compare(password, user.password))) {
    redirect('/login?error=1');
  }
  createSession(user.id);
  await logActivity(user, 'سجّل الدخول');
  redirect('/');
}

export default async function LoginPage({ searchParams }) {
  if (await getUser()) redirect('/');
  return (
    <div className="grid min-h-screen bg-white dark:bg-ink-900 lg:grid-cols-2">
      <div className="flex items-center justify-center p-6">
        <form action={login} className="w-full max-w-sm animate-fade-up">
          <div className="mb-8">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-glow"><Anchor className="h-7 w-7" /></div>
            <h1 className="!text-3xl">أهلاً بعودتك</h1>
            <p className="mt-2 text-sm text-slate-500">سجّل الدخول إلى منصة إدارة التخليص الجمركي</p>
          </div>
          {searchParams?.error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">اسم المستخدم أو كلمة المرور غير صحيحة</div>}
          <div className="mb-4"><label>اسم المستخدم</label><input name="username" className="input h-12" required autoFocus dir="ltr" /></div>
          <div className="mb-6"><label>كلمة المرور</label><input name="password" type="password" className="input h-12" required dir="ltr" /></div>
          <button className="btn-primary h-12 w-full text-base">دخول</button>
          <Link href="/track" className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-brand-600"><MapPin className="h-4 w-4" /> عميل؟ تتبع شحنتك من هنا</Link>
        </form>
      </div>
      <div className="hidden p-4 lg:block">
        <div className="flex h-full flex-col">
          <OceanHero>
            <div className="max-w-md">
              <h2 className="!text-3xl !text-white">كل عملك الجمركي في منصة واحدة</h2>
              <p className="mt-2 text-white/75">معاملات، شحنات، فواتير، محاسبة وذكاء اصطناعي.</p>
            </div>
          </OceanHero>
          <div className="grid flex-1 grid-cols-3 gap-4">
            {[[Ship, 'تتبع الشحنات', 'مسار حي وموعد وصول وصفحة تتبع للعميل'], [Sparkles, 'ذكاء اصطناعي', 'مساعد يقرأ بياناتك ويقترح البنود الجمركية'], [ShieldCheck, 'صلاحيات وأمان', 'أدوار وسجل نشاط كامل']].map(([I, t, d]) => (
              <div key={t} className="card flex flex-col justify-center">
                <I className="mb-3 h-6 w-6 text-brand-600" /><b className="font-display">{t}</b><p className="mt-1 text-xs text-slate-500">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
