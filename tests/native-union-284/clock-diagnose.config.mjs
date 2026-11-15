import {defineConfig} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import original from './pg18-browser.config.mjs';
export default defineConfig({...original,testMatch:'clock-diagnose.spec.mjs',projects:original.projects.filter(p=>p.name==='390'),retries:0,maxFailures:0,outputDir:'../../node_modules/.cache/native-clock-diagnosis',use:{...original.use,trace:'on'},reporter:[['list'],['json',{outputFile:'node_modules/.cache/native-clock-diagnosis/outcomes.json'}]]});
