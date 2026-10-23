import base from './playwright.config.mjs';
const config={...base,testMatch:'control-receipt.browser.spec.mjs',outputDir:'../../experiments/consumer-mvp/web/node_modules/.cache/control-receipt'};
export default config;
