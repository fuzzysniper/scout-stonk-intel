import {fileURLToPath} from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const repo = fileURLToPath(new URL('../../', import.meta.url));
// Uses the already pinned, test-only prototype tooling. No root dependency change.
const headers = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};
const config = {
  root,
  server: {host:'127.0.0.1', port:4192, strictPort:true, fs:{allow:[repo]}},
  preview: {host:'127.0.0.1', port:4192, strictPort:true, headers},
  build: {outDir:repo+'experiments/consumer-mvp/web/node_modules/.cache/unfarmd-brand', emptyOutDir:true},
};
export default config;
