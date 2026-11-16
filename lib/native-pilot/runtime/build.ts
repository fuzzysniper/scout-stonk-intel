/** PUBLIC build metadata only. Webpack substitutes the actual clean checkout.
 * No process.env/request/credential can populate these values. Shipped selection OFF. */
declare const __UNFARMD_NATIVE_INSTALLED__:boolean;
declare const __UNFARMD_NATIVE_CONTROL_PLAN__:import('../admission/contract').ControlPlan|null;
declare const __UNFARMD_RESEARCH_BUILD__:Readonly<{commit:string;tree:string}>|null;
export const NATIVE_RUNTIME_BRANCH='native-pilot/private-beta-rc';
export const NATIVE_RUNTIME_INSTALLED=typeof __UNFARMD_NATIVE_INSTALLED__!=='undefined'&&__UNFARMD_NATIVE_INSTALLED__===true;
export const NATIVE_RUNTIME_BUILD=NATIVE_RUNTIME_INSTALLED&&typeof __UNFARMD_RESEARCH_BUILD__!=='undefined'?__UNFARMD_RESEARCH_BUILD__:null;
export const NATIVE_RUNTIME_PLAN=NATIVE_RUNTIME_INSTALLED&&typeof __UNFARMD_NATIVE_CONTROL_PLAN__!=='undefined'?__UNFARMD_NATIVE_CONTROL_PLAN__:null;
