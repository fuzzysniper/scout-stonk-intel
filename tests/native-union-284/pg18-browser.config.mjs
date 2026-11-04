// Called ONLY by B's approved, isolated, actual PostgreSQL job with a real server.
import {defineConfig} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import original from './browser.config.mjs';
export default defineConfig({...original,webServer:undefined,timeout:60000,outputDir:'../../node_modules/.cache/native-union-pg18-results'});
