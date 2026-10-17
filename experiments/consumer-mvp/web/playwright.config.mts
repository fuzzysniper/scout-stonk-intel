import {defineConfig} from '@playwright/test';
import {existsSync} from 'node:fs';
const executablePath = process.env.CLEAR_CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
export default defineConfig({
  testDir:'./tests', testMatch:'**/*.spec.mts', fullyParallel:false, workers:1,
  outputDir:'./node_modules/.cache/project-clear-browser', reporter:'list',
  use:{baseURL:'http://127.0.0.1:4176', browserName:'chromium', launchOptions:{executablePath,args:['--no-sandbox','--disable-dev-shm-usage']}},
  projects:[
    {name:'320',use:{viewport:{width:320,height:740},isMobile:true,hasTouch:true}},
    {name:'390',use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}},
    {name:'1280',use:{viewport:{width:1280,height:900}}},
  ],
  webServer:{command:'npm run preview',url:'http://127.0.0.1:4176',reuseExistingServer:false,timeout:15000},
});
