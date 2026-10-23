import base from './playwright.config.mjs';
const config={...base,testMatch:'polish.browser.spec.mjs',outputDir:'../../experiments/consumer-mvp/web/node_modules/.cache/unfarmd-polish-qa'};
export default config;
