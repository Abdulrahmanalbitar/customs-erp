'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Sparkles, LoaderCircle, Bot } from 'lucide-react';

const SUGGESTIONS = [
  'أعطني ملخص وضع المكتب اليوم',
  'ما المعاملات التي تنقصها مستندات؟',
  'أي الشحنات ستصل هذا الأسبوع؟',
  'من هم العملاء الأكثر ديوناً؟',
  'ما المستندات المطلوبة لاستيراد أجهزة طبية إلى سوريا؟',
  'اشرح الفرق بين CIF و FOB في حساب الرسوم',
];

// tiny, safe markdown: **bold**, [text](/internal), bullet lines
function Rich({ text }) {
  return text.split('\n').map((line, i) => {
    const bullet = /^\s*[-*•]\s+/.test(line);
    const clean = line.replace(/^\s*[-*•]\s+/, '').replace(/^#+\s*/, '');
    const parts = [];
    const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((\/[^)\s]*)\)/g;
    let last = 0, m, k = 0;
    while ((m = re.exec(clean))) {
      if (m.index > last) parts.push(clean.slice(last, m.index));
      if (m[1]) parts.push(<b key={k++}>{m[1]}</b>);
      else parts.push(<Link key={k++} href={m[3]} className="link">{m[2]}</Link>);
      last = re.lastIndex;
    }
    parts.push(clean.slice(last));
    if (!line.trim()) return <div key={i} className="h-2" />;
    return bullet
      ? <div key={i} className="flex gap-2"><span className="text-brand-500">•</span><span>{parts}</span></div>
      : <p key={i}>{parts}</p>;
  });
}

export default function AiChat({ compact = false, enabled = true }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, busy]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const next = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const r = await fetch('/api/ai', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'chat', messages: next }) });
      const d = await r.json();
      setMessages([...next, { role: 'assistant', content: d.reply || `⚠️ ${d.error}`, error: !d.reply }]);
    } catch {
      setMessages([...next, { role: 'assistant', content: '⚠️ تعذر الاتصال بالخادم', error: true }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${compact ? '' : 'h-[calc(100vh-11rem)]'}`}>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {!messages.length && (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-fuchsia-500 to-brand-600 text-white shadow-glow">
              <Sparkles className="h-8 w-8" />
            </div>
            <h2 className="text-lg">كيف أقدر ساعدك اليوم؟</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">أقرأ بيانات المكتب مباشرة: المعاملات، الشحنات، الفواتير، العملاء، وأجاوب على أسئلتك الجمركية.</p>
            {!enabled && (
              <div className="mx-auto mt-4 max-w-sm rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                لتفعيل المساعد أضف <code className="chip">ANTHROPIC_API_KEY</code> في ملف ‎.env
              </div>
            )}
            <div className={`mx-auto mt-6 grid max-w-2xl gap-2 ${compact ? '' : 'sm:grid-cols-2'}`}>
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-sm transition hover:border-brand-300 hover:shadow-glow dark:border-white/10 dark:bg-white/5">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {m.role === 'assistant' && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-brand-600 text-white"><Bot className="h-4 w-4" /></div>
            )}
            <div className={`max-w-[85%] space-y-1 rounded-2xl px-4 py-3 text-sm leading-7 ${
              m.role === 'user' ? 'bg-brand-600 text-white' : m.error ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300' : 'bg-slate-100 dark:bg-white/5'
            }`}>
              {m.role === 'user' ? m.content : <Rich text={m.content} />}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> يحلل البيانات...</div>
        )}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t p-4 dark:border-white/5">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 focus-within:border-brand-400 dark:border-white/10 dark:bg-ink-900">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            placeholder="اكتب سؤالك..."
            className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
          />
          <button disabled={busy || !input.trim()} className="btn-primary h-10 w-10 p-0" aria-label="إرسال"><Send className="h-4 w-4 -scale-x-100" /></button>
        </div>
      </form>
    </div>
  );
}
