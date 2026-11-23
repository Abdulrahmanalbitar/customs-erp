'use client';
import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Printer, TriangleAlert } from 'lucide-react';
import { useT } from './LangProvider';

/** Submit button with optional styled confirm dialog (replaces window.confirm). */
export function SubmitButton({ children, className = 'btn-primary', confirm: msg }) {
  const { pending } = useFormStatus();
  const { t } = useT();
  const [ask, setAsk] = useState(false);
  const ref = useRef(null);
  return (
    <>
      <button
        ref={ref}
        className={className}
        disabled={pending}
        onClick={(e) => {
          if (msg && !ask) { e.preventDefault(); setAsk(true); }
        }}
      >
        {pending ? t('...جارٍ الحفظ', 'Saving…') : children}
      </button>
      {ask && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setAsk(false)}>
          <div className="w-full max-w-sm animate-pop rounded-[18px] bg-white p-6 text-start shadow-2xl dark:bg-ink-800" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10"><TriangleAlert className="h-5 w-5" /></div>
            <div className="font-bold">{t('تأكيد العملية', 'Please confirm')}</div>
            <p className="mt-1 text-sm text-slate-500">{msg}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setAsk(false)}>{t('إلغاء', 'Cancel')}</button>
              <button type="button" className="btn-danger" onClick={() => { setAsk(false); ref.current?.form?.requestSubmit(ref.current); }}>{t('تأكيد', 'Confirm')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function PrintButton({ children }) {
  const { t } = useT();
  return (
    <button type="button" className="btn-secondary" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> {children || t('طباعة / PDF', 'Print / PDF')}
    </button>
  );
}
