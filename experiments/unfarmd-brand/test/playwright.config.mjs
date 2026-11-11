import {defineConfig} from '../../consumer-mvp/web/node_modules/@playwright/test/index.mjs';
export default defineConfig({
 testDir:'.',testMatch:'browser.spec.mjs',workers:1,fullyParallel:false,reporter:'list',
 outputDir:'../../consumer-mvp/web/node_modules/.cache/unfarmd-browser',
 use:{baseURL:'http://127.0.0.1:4192',browserName:'chromium',launchOptions:{executablePath:process.env.CONSUMER_CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}},
 projects:[{name:'320',use:{viewport:{width:320,height:740},isMobile:true,hasTouch:true}},{name:'390',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},{name:'1280',use:{viewport:{width:1280,height:900}}}],
 webServer:[{command:'node experiments/consumer-mvp/web/node_modules/vite/bin/vite.js preview --config experiments/unfarmd-brand/vite.config.mjs',cwd:'../../..',url:'http://127.0.0.1:4192',reuseExistingServer:false,timeout:20000},{command:'npm run start -- --hostname 127.0.0.1 --port 4180',cwd:'../../..',url:'http://127.0.0.1:4180',reuseExistingServer:false,timeout:30000}],
});
