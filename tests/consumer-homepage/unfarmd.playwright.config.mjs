import base from './playwright.config.mjs';
const config={...base,testMatch:process.env.UNFARMD_QA_BASELINE==='1'?'unfarmd-baseline.spec.mjs':'unfarmd.browser.spec.mjs',outputDir:'../../experiments/consumer-mvp/web/node_modules/.cache/unfarmd-consumer-qa'};
export default config;
