// Minimal bilingual helper: every string is written inline as t('عربي', 'English').
// The language lives in the `lang` cookie so server components can render the right one.
export const LANGS = ['ar', 'en'];

export function makeT(lang) {
  return (ar, en) => (lang === 'en' && en ? en : ar);
}

export async function getLang() {
  const { cookies } = await import('next/headers');
  const v = cookies().get('lang')?.value;
  return v === 'en' ? 'en' : 'ar';
}

export async function getT() {
  const lang = await getLang();
  return { lang, t: makeT(lang), dir: lang === 'en' ? 'ltr' : 'rtl' };
}
