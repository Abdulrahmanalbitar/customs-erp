// Colours come from CSS variables (see app/globals.css) so themes (light / dark / royal / blueprint)
// can re-tint the whole app without touching components.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './static/*.{js,jsx}', './static/shims/*.js'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'Inter', 'Tahoma', 'sans-serif'],
        display: ['"IBM Plex Sans Arabic"', 'Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        brand: Object.fromEntries([50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((k) => [k, v(`b-${k}`)])),
        ink: { 900: v('ink-900'), 800: v('ink-800'), 700: v('ink-700'), 600: v('ink-600') },
        gold: { 400: '#e2c587', 500: '#c9a45c' },
        onbrand: v('on-brand'),
      },
      boxShadow: {
        soft: 'var(--shadow)',
        glow: '0 10px 30px -10px rgb(var(--b-500) / .45)',
        lift: '0 16px 36px -14px rgb(var(--b-500) / .38)',
      },
      borderRadius: { card: '14px' },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        pop: { from: { opacity: 0, transform: 'translateY(8px) scale(.97)' }, to: { opacity: 1, transform: 'none' } },
        float: { '0%,100%': { transform: 'translate(0,0)' }, '50%': { transform: 'translate(20px,-14px)' } },
        skeleton: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-up': 'fade-up .55s cubic-bezier(.2,.7,.2,1) both',
        pop: 'pop .2s ease-out both',
        float: 'float 9s ease-in-out infinite',
        skeleton: 'skeleton 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
