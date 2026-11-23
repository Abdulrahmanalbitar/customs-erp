import { NextResponse } from 'next/server';
import { getUser, can } from '@/lib/auth';
import { aiEnabled, chat, suggestHs, extractDocument } from '@/lib/ai';
import { logActivity } from '@/lib/activity';

export const maxDuration = 120;

const NO_KEY = 'المساعد الذكي غير مفعّل. أضف ANTHROPIC_API_KEY إلى ملف .env ثم أعد تشغيل النظام.';

export async function POST(req) {
  const user = await getUser();
  if (!user || !can(user, 'ai')) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  if (!aiEnabled()) return NextResponse.json({ error: NO_KEY }, { status: 503 });

  try {
    const type = req.headers.get('content-type') || '';
    if (type.startsWith('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') return NextResponse.json({ error: 'لم يتم إرفاق ملف' }, { status: 400 });
      const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      if (!allowed.includes(file.type)) return NextResponse.json({ error: 'الصيغة غير مدعومة (PDF أو صورة)' }, { status: 400 });
      if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: 'الملف أكبر من 20MB' }, { status: 400 });
      const data = await extractDocument(Buffer.from(await file.arrayBuffer()), file.type);
      await logActivity(user, 'قراءة مستند بالذكاء الاصطناعي', 'ai', null, file.name);
      return NextResponse.json({ data });
    }

    const body = await req.json();
    if (body.action === 'hs') {
      return NextResponse.json({ data: await suggestHs(String(body.goods || ''), body.origin) });
    }
    if (body.action === 'brief') {
      const reply = await chat([{ role: 'user', content: 'اكتب "ملخص اليوم" لمدير المكتب في 3 إلى 4 جمل قصيرة بدون عناوين أو روابط: الفواتير المتأخرة وأكبرها، المعاملات العالقة، الشحنات القريبة أو المتأخرة، ومقبوضات الشهر. استخدم أداة office_overview.' }]);
      return NextResponse.json({ reply: reply.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '') });
    }
    if (body.action === 'chat') {
      const msgs = Array.isArray(body.messages) ? body.messages.filter((m) => ['user', 'assistant'].includes(m.role) && m.content) : [];
      if (!msgs.length || msgs.at(-1).role !== 'user') return NextResponse.json({ error: 'رسالة فارغة' }, { status: 400 });
      return NextResponse.json({ reply: await chat(msgs) });
    }
    return NextResponse.json({ error: 'طلب غير معروف' }, { status: 400 });
  } catch (e) {
    console.error('[ai]', e);
    const msg = e?.status === 401 ? 'مفتاح API غير صالح' : e?.status === 429 ? 'تم تجاوز حد الطلبات، حاول بعد قليل' : e?.message || 'خطأ غير متوقع';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
