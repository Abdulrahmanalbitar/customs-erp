import { useMemo } from 'react';
import { useLocation, useNavigate, useParams as useRRParams } from 'react-router-dom';
import { bridge, RedirectSignal, NotFoundSignal } from './bridge';

export function redirect(to) {
  bridge.navigate(to, { replace: true });
  throw new RedirectSignal(to);
}
export const permanentRedirect = redirect;
export function notFound() { throw new NotFoundSignal(); }

export function useRouter() {
  const nav = useNavigate();
  return useMemo(() => ({
    push: (to) => nav(to),
    replace: (to) => nav(to, { replace: true }),
    back: () => nav(-1),
    forward: () => nav(1),
    refresh: () => window.dispatchEvent(new Event('db:changed')),
    prefetch: () => {},
  }), [nav]);
}
export function usePathname() { return useLocation().pathname; }
export function useSearchParams() { return new URLSearchParams(useLocation().search); }
export function useParams() { return useRRParams(); }
