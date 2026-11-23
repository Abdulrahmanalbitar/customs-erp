// Entry point of the static (GitHub Pages) build: the same pages and components as the Next.js app,
// routed in the browser with a HashRouter and backed by the in-browser database (shims/db.js).
import '@fontsource/ibm-plex-sans-arabic/300.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '../app/globals.css';

import { Component, Suspense, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { LangProvider } from '@/components/LangProvider';
import { initDb } from './shims/db';
import { bridge } from './shims/bridge';
import { installInterceptors } from './interceptors';
import AppLayout from '../app/(app)/layout.js';

// ---------- routes from the app/ folder ----------
const pageModules = import.meta.glob(['../app/**/page.js'], { eager: true });

function routePath(file) {
  const p = file.replace('../app', '').replace(/\/page\.js$/, '').replace(/\/\([^)]+\)/g, '').replace(/\[(\w+)\]/g, ':$1');
  return p || '/';
}
const routes = Object.entries(pageModules).map(([file, mod]) => ({
  path: routePath(file),
  inApp: file.includes('/(app)/'),
  Page: mod.default,
}));

const isAsync = (fn) => fn?.constructor?.name === 'AsyncFunction';

// ---------- async "server component" runner ----------
function useReloadKey(extra) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const on = () => setN((x) => x + 1);
    window.addEventListener('db:changed', on);
    return () => window.removeEventListener('db:changed', on);
  }, []);
  return `${n}:${extra}`;
}

function NotFound() {
  return (
    <div className="p-16 text-center">
      <div className="text-5xl">⚓</div>
      <h1 className="mt-4">الصفحة غير موجودة</h1>
      <a href="#/" className="link mt-3 inline-block">العودة للرئيسية</a>
    </div>
  );
}

function ErrorBox({ error }) {
  return (
    <div className="m-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      <b>حدث خطأ:</b> {String(error?.message || error)}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 p-2">
      <div className="skeleton h-10 w-1/3 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-card" />)}</div>
      <div className="skeleton h-64 rounded-card" />
    </div>
  );
}

/** Calls an async page/layout function and renders its result; re-runs when data changes. */
function AsyncView({ fn, props, reloadOn, fallback = <Skeleton /> }) {
  const key = useReloadKey(reloadOn);
  const [out, setOut] = useState({ el: null, error: null, ready: false });
  const live = useRef(0);
  useEffect(() => {
    const id = ++live.current;
    Promise.resolve()
      .then(() => fn(props))
      .then((el) => { if (id === live.current) setOut({ el, error: null, ready: true }); })
      .catch((e) => {
        if (id !== live.current || e?.isRedirect) return;
        setOut({ el: e?.isNotFound ? <NotFound /> : null, error: e?.isNotFound ? null : e, ready: true });
        if (!e?.isNotFound) console.error(e);
      });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (out.error) return <ErrorBox error={out.error} />;
  return out.ready ? out.el : fallback;
}

/** Errors thrown by form actions land here; redirects are navigation, not errors. */
class ActionBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error: error?.isRedirect ? null : error }; }
  componentDidCatch(error) { if (!error?.isRedirect && !error?.isNotFound) console.error(error); }
  render() {
    if (this.state.error) {
      return (
        <div>
          <ErrorBox error={this.state.error} />
          <button className="btn-secondary mx-6" onClick={() => this.setState({ error: null })}>رجوع</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function RoutedPage({ Page }) {
  const params = useParams();
  const loc = useLocation();
  const searchParams = Object.fromEntries(new URLSearchParams(loc.search));
  const props = { params, searchParams };
  const page = isAsync(Page)
    ? <AsyncView fn={Page} props={props} reloadOn={loc.pathname + loc.search} />
    : <Page {...props} />;
  return <ActionBoundary key={loc.pathname}>{page}</ActionBoundary>;
}

/** The (app) layout wraps every app page; <Outlet/> always renders the current route. */
function AppFrame() {
  const loc = useLocation();
  return <AsyncView fn={AppLayout} props={{ children: <Outlet /> }} reloadOn={loc.pathname} fallback={<div className="min-h-screen" />} />;
}

function NavBridge() {
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => { bridge.navigate = (to, o) => nav(to, o); }, [nav]);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return null;
}

function readLang() {
  const m = document.cookie.match(/(?:^|; )lang=(\w+)/);
  return m?.[1] === 'en' ? 'en' : 'ar';
}

function App() {
  const lang = readLang();
  return (
    <LangProvider lang={lang}>
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <NavBridge />
        <Suspense fallback={<Skeleton />}>
          <Routes>
            <Route element={<AppFrame />}>
              {routes.filter((r) => r.inApp).map((r) => <Route key={r.path} path={r.path} element={<RoutedPage key={r.path} Page={r.Page} />} />)}
            </Route>
            {routes.filter((r) => !r.inApp).map((r) => <Route key={r.path} path={r.path} element={<RoutedPage key={r.path} Page={r.Page} />} />)}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </HashRouter>
    </LangProvider>
  );
}

(async () => {
  const lang = readLang();
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
  installInterceptors();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('./sw.js').catch(() => {});
  await initDb();
  const quiet = (e) => e?.isRedirect || e?.isNotFound;
  createRoot(document.getElementById('root'), {
    onCaughtError: (e) => { if (!quiet(e)) console.error(e); },
    onUncaughtError: (e) => { if (!quiet(e)) console.error(e); },
  }).render(<App />);
})();
