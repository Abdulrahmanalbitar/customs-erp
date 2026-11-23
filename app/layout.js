import '@fontsource/ibm-plex-sans-arabic/300.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import './globals.css';
import { getT } from '@/lib/i18n';
import { LangProvider } from '@/components/LangProvider';

export async function generateMetadata() {
  const { t } = await getT();
  return {
    title: t('منصة إدارة التخليص الجمركي', 'Customs Clearance Platform'),
    description: t('نظام ERP ونقطة بيع وتتبع شحنات لمكاتب التخليص الجمركي', 'ERP, POS and shipment tracking for customs clearance offices'),
    applicationName: t('منصة التخليص الجمركي', 'Customs Clearance Platform'),
    icons: { icon: '/icons/icon.svg', apple: '/icons/apple-touch-icon.png' },
    appleWebApp: { capable: true, title: t('التخليص', 'Clearance'), statusBarStyle: 'black-translucent' },
  };
}

export const viewport = { themeColor: '#0f4fb8', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

// Theme before first paint: system | light | dark | royal | blueprint
const themeScript = `try{var t=localStorage.getItem('theme')||'system',d=document.documentElement;var dark=t==='dark'||t==='royal'||t==='blueprint'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(dark)d.classList.add('dark');if(t==='royal'||t==='blueprint')d.dataset.theme=t;}catch(e){}if('serviceWorker' in navigator&&location.protocol==='https:')addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})});`;

export default async function RootLayout({ children }) {
  const { lang, dir } = await getT();
  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <LangProvider lang={lang}>{children}</LangProvider>
      </body>
    </html>
  );
}
