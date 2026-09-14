import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
await build({
  root, configFile: false, plugins: [react()], base: './',
  resolve: { alias: [{ find: '../api', replacement: path.join(root, 'src/preview/api.ts') }] },
  build: { outDir: 'dist-preview', assetsInlineLimit: 1024 * 1024,
    rollupOptions: { input: path.join(root, 'preview.html'), output: { inlineDynamicImports: true } } },
});
const dir = path.join(root, 'dist-preview');
let html = await readFile(path.join(dir, 'preview.html'), 'utf8');
for (const file of await readdir(path.join(dir, 'assets'))) {
  if (file.endsWith('.js')) {
    const code = (await readFile(path.join(dir, 'assets', file), 'utf8')).replace(/<\/script/gi, '<\\/script');
    html = html.replace(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/, () => `<script type="module">${code}</script>`);
  } else if (file.endsWith('.css')) {
    const css = (await readFile(path.join(dir, 'assets', file), 'utf8')).replace(/<\/style/gi, '<\\/style');
    html = html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/, () => `<style>${css}</style>`);
  } else throw new Error(`Unexpected external asset: ${file}`);
}
html = html.replace('<head>', `<head><meta name="referrer" content="strict-origin-when-cross-origin"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https://tile.openstreetmap.org; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">`);
if (/<script[^>]+src=|<link[^>]+rel="stylesheet"/.test(html)) throw new Error('Preview must be self-contained');
await writeFile(path.join(dir, 'TOSH_Preview.html'), html);
console.log('Ready: dist-preview/TOSH_Preview.html (offline, no server connection)');
