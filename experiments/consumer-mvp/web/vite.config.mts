import {defineConfig} from 'vite';

export default defineConfig({
  base: './',
  build: {assetsInlineLimit: 0, outDir: 'node_modules/.cache/project-clear-build'},
  preview: {headers: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  }},
});
