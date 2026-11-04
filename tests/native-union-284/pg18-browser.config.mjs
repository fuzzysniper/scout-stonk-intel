// Called ONLY by B's approved, isolated, actual PostgreSQL job with a real server.
import {defineConfig} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import original from './browser.config.mjs';
// Two REAL mandatory2500ms B waits plus native SQL/TLS precede the result.
// The unchanged consumer still enforces its own10000ms acquisition timeout.
// A five-second assertion cannot cover this path; no runtime pacing/gate changes.
export default defineConfig({...original,webServer:undefined,timeout:60000,expect:{timeout:15000},outputDir:'../../node_modules/.cache/native-union-pg18-results'});
