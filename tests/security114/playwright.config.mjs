import base from '../consumer-homepage/playwright.config.mjs';
const config={
 ...base,testDir:'..',
 testMatch:['consumer-homepage/browser.spec.mjs','consumer-homepage/onchain.browser.spec.mjs','consumer-homepage/synthetic.browser.spec.mjs','security114/browser.spec.mjs','security114/terminal.browser.spec.mjs'],
};
export default config;
