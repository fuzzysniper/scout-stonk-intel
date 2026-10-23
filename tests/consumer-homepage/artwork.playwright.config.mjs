import base from './playwright.config.mjs';
const config={...base,testMatch:'artwork.browser.spec.mjs',outputDir:'../../experiments/consumer-mvp/web/node_modules/.cache/unfarmd-artwork'};
export default config;
