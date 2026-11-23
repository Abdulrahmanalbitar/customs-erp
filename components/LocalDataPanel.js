'use client';
import { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, HardDrive } from 'lucide-react';
import { localData } from '@/lib/local-data';
import { useT } from './LangProvider';

/** Static build only: data is kept on this device, so offer backup / restore / reset. */
export default function LocalDataPanel() {
  const { t } = useT();
  const file = useRef(null);
  const [msg, setMsg] = useState(null);
  const [ask, setAsk] = useState(false);
  if (!localData) return null;

  const download = () => {
    const blob = new Blob([JSON.stringify(localData.exportDb())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `customs-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setMsg({ ok: true, text: t('تم تنزيل النسخة الاحتياطية.', 'Backup downloaded.') });
  };
  const restore = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await localData.importDb(JSON.parse(await f.text()));
      setMsg({ ok: true, text: t('تمت استعادة البيانات.', 'Data restored.') });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    }
    e.target.value = '';
  };

  return (
    <div className="card mb-6 border-amber-200 bg-amber-50/50 dark:border-amber-500/20 dark:bg-amber-500/5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><HardDrive className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2>{t('البيانات محفوظة على هذا الجهاز', 'Data is stored on this device')}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {t('هذه النسخة تعمل بدون سيرفر: كل شي بتسجله بينحفظ بمتصفح هالجهاز بس. خذ نسخة احتياطية بشكل دوري، وفيك تنقل البيانات لجهاز تاني باستعادتها هناك.',
              'This version runs without a server: everything is saved in this browser only. Download backups regularly; restore one on another device to move your data.')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={download}><Download className="h-4 w-4" /> {t('تنزيل نسخة احتياطية', 'Download backup')}</button>
            <button type="button" className="btn-secondary" onClick={() => file.current?.click()}><Upload className="h-4 w-4" /> {t('استعادة من ملف', 'Restore from file')}</button>
            <input ref={file} type="file" accept="application/json,.json" className="hidden" onChange={restore} />
            {!ask
              ? <button type="button" className="btn-ghost text-red-600" onClick={() => setAsk(true)}><RotateCcw className="h-4 w-4" /> {t('إرجاع البيانات التجريبية', 'Reset to demo data')}</button>
              : <button type="button" className="btn-danger" onClick={async () => { await localData.resetDb(); setAsk(false); setMsg({ ok: true, text: t('رجعت البيانات التجريبية.', 'Demo data restored.') }); }}>{t('متأكد؟ رح تنمسح بياناتك', 'Sure? Your data will be erased')}</button>}
          </div>
          {msg && <div className={`mt-3 text-sm ${msg.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>{msg.text}</div>}
        </div>
      </div>
    </div>
  );
}
