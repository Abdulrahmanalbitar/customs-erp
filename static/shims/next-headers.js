// Cookies via document.cookie (only non-sensitive values such as the UI language live here).
export function cookies() {
  const all = () => Object.fromEntries(document.cookie.split('; ').filter(Boolean).map((c) => { const i = c.indexOf('='); return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))]; }));
  return {
    get: (name) => (name in all() ? { name, value: all()[name] } : undefined),
    set: (name, value, opts = {}) => { document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${opts.maxAge ?? 31536000}; samesite=lax`; },
    delete: (name) => { document.cookie = `${name}=; path=/; max-age=0`; },
    has: (name) => name in all(),
  };
}
export function headers() { return new Headers(); }
