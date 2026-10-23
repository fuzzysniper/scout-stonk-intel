import {defineConfig} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import {existsSync} from 'node:fs';
export default defineConfig({
 testDir:'../live-feed',testMatch:['browser.spec.mjs'],workers:1,fullyParallel:false,reporter:'list',
 outputDir:'../../experiments/consumer-mvp/web/node_modules/.cache/next-homepage-browser',
 use:{baseURL:'http://127.0.0.1:4180',browserName:'chromium',launchOptions:{executablePath:process.env.CONSUMER_CHROMIUM_PATH||(existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),args:['--no-sandbox','--disable-dev-shm-usage']}},
 projects:[{name:'320',use:{viewport:{width:320,height:740},isMobile:true,hasTouch:true}},{name:'390',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},{name:'1280',use:{viewport:{width:1280,height:900}}}],
 webServer:[{command:'npm run start -- --hostname 127.0.0.1 --port 4180',cwd:'../..',url:'http://127.0.0.1:4180',reuseExistingServer:false,timeout:30000}],
});
