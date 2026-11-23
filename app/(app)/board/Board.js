'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { FileCheck2, FileWarning, User, Clock } from 'lucide-react';
import { DECL_STATUS, OPEN_STATUSES, PRIORITY } from '@/lib/constants';
import { moveDeclaration } from '../declarations/actions';

const COLS = [...OPEN_STATUSES, 'RELEASED'];
const BAR = { LOW: 'bg-slate-300', NORMAL: 'bg-sky-400', HIGH: 'bg-orange-400', URGENT: 'bg-red-500' };

export default function Board({ initial }) {
  const [cards, setCards] = useState(initial);
  const [over, setOver] = useState(null);
  const [, start] = useTransition();

  const drop = (status, e) => {
    e.preventDefault();
    setOver(null);
    const id = Number(e.dataTransfer.getData('text/plain'));
    const card = cards.find((c) => c.id === id);
    if (!card || card.status === status) return;
    setCards(cards.map((c) => (c.id === id ? { ...c, status } : c)));
    start(() => moveDeclaration(id, status));
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLS.map((col) => {
        const items = cards.filter((c) => c.status === col);
        return (
          <div
            key={col}
            onDragOver={(e) => { e.preventDefault(); setOver(col); }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => drop(col, e)}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border p-3 transition ${
              over === col ? 'border-brand-400 bg-brand-50/60 dark:bg-brand-500/10' : 'border-slate-200/70 bg-slate-100/60 dark:border-white/5 dark:bg-white/[.02]'
            }`}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className={`badge ${DECL_STATUS[col].color}`}>{DECL_STATUS[col].label}</span>
              <span className="text-xs font-bold text-slate-400">{items.length}</span>
            </div>
            <div className="min-h-[200px] flex-1 space-y-2">
              {items.map((c) => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', String(c.id))}
                  className="group relative cursor-grab overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-glow active:cursor-grabbing dark:border-white/5 dark:bg-ink-800"
                >
                  <span className={`absolute inset-y-0 right-0 w-1 ${BAR[c.priority] || BAR.NORMAL}`} />
                  <div className="flex items-center justify-between">
                    <Link href={`/declarations/${c.id}`} className="link font-mono text-xs">{c.refNo}</Link>
                    {c.priority !== 'NORMAL' && <span className={`badge ${PRIORITY[c.priority]?.color}`}>{PRIORITY[c.priority]?.label}</span>}
                  </div>
                  <div className="mt-1.5 text-sm font-semibold">{c.client}</div>
                  <div className="truncate text-xs text-slate-500">{c.goods || '—'}</div>
                  <div className="mt-3 flex items-center gap-3 text-[11px] text-slate-500">
                    <span className={`flex items-center gap-1 ${c.docsOk ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {c.docsOk ? <FileCheck2 className="h-3.5 w-3.5" /> : <FileWarning className="h-3.5 w-3.5" />}{c.docs}
                    </span>
                    {c.broker && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{c.broker}</span>}
                    <span className="mr-auto flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{c.days} يوم</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
