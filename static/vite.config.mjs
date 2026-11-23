// Static build: the same app compiled for the browser only (GitHub Pages). Run from the repo root:
//   npm run build:static   → site/  (served by GitHub Pages through the root index.html)
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const shim = (f) => path.join(here, 'shims', f);

// lib/* files import each other relatively (./db, ./auth ...): send those to the browser shims too.
const SWAP = { db: 'db.js', auth: 'auth.js', ai: 'ai.js', storage: 'storage.js' };
const libShims = {
  name: 'lib-shims',
  enforce: 'pre',
  resolveId(source, importer) {
    if (!importer || !importer.startsWith(path.join(root, 'lib') + path.sep)) return null;
    const m = source.match(/^\.\/(\w+)(\.js)?$/);
    return m && SWAP[m[1]] ? shim(SWAP[m[1]]) : null;
  },
};

export default defineConfig({
  root: here,
  base: './',
  publicDir: path.join(here, 'public'),
  plugins: [libShims, react({ include: /\.(js|jsx)$/ })],
  esbuild: { loader: 'jsx', include: /\.(js|jsx)$/, exclude: [] },
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  resolve: {
    alias: [
      { find: /^react$/, replacement: 'react19' },
      { find: /^react\/(.*)$/, replacement: 'react19/$1' },
      { find: /^react-dom$/, replacement: 'react-dom19' },
      { find: /^react-dom\/(.*)$/, replacement: 'react-dom19/$1' },
      { find: '@/lib/db', replacement: shim('db.js') },
      { find: '@/lib/auth', replacement: shim('auth.js') },
      { find: '@/lib/ai', replacement: shim('ai.js') },
      { find: '@/lib/storage', replacement: shim('storage.js') },
      { find: '@/lib/constants', replacement: shim('constants.js') },
      { find: '@/lib/local-data', replacement: shim('local-data.js') },
      { find: /^next\/link$/, replacement: shim('next-link.js') },
      { find: /^next\/navigation$/, replacement: shim('next-navigation.js') },
      { find: /^next\/headers$/, replacement: shim('next-headers.js') },
      { find: /^next\/cache$/, replacement: shim('next-cache.js') },
      { find: /^next\/server$/, replacement: shim('next-server.js') },
      { find: /^server-only$/, replacement: shim('server-only.js') },
      { find: /^@\//, replacement: root + '/' },
    ],
  },
  define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env.STATIC_BUILD': JSON.stringify('1') },
  server: { fs: { allow: [root] } },
  build: { outDir: path.join(root, 'site'), emptyOutDir: true, chunkSizeWarningLimit: 1500 },
});
