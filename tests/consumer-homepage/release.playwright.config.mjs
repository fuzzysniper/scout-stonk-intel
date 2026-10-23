import base from './playwright.config.mjs';
const config={...base,testMatch:'release.browser.spec.mjs',outputDir:'../../experiments/consumer-mvp/web/node_modules/.cache/unfarmd-release'};
export default config;
