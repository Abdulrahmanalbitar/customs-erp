'use client';
import { createContext, useContext } from 'react';
import { makeT } from '@/lib/i18n';

const Ctx = createContext({ lang: 'ar', t: makeT('ar') });

export function LangProvider({ lang, children }) {
  return <Ctx.Provider value={{ lang, t: makeT(lang) }}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);

export function setLang(lang) {
  document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}
