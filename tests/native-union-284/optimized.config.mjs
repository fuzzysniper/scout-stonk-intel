// Execute ORIGINAL optimized OFF tests unchanged, selecting this new exact UI branch.
import {defineConfig} from '../../experiments/consumer-mvp/web/node_modules/@playwright/test/index.mjs';
import original from '../native-lens/optimized.config.mjs';
export default defineConfig({...original,testDir:'../native-lens',outputDir:'../../node_modules/.cache/native-union-284-optimized',webServer:{...original.webServer,env:{...original.webServer.env,VERCEL_GIT_COMMIT_REF:'integration/284-native-corrections'}}});
