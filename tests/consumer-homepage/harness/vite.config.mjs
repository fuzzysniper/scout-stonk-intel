import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url)),repo=fileURLToPath(new URL('../../../',import.meta.url));
const config={root,publicDir:repo+'public',oxc:{jsx:{runtime:'automatic'}},resolve:{alias:{'next/link':fileURLToPath(new URL('./link.tsx',import.meta.url))}},server:{host:'127.0.0.1',port:4181,strictPort:true,fs:{allow:[repo]}},build:{outDir:repo+'experiments/consumer-mvp/web/node_modules/.cache/mint-harness',emptyOutDir:true}};
export default config;
