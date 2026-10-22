import ts from '../../node_modules/typescript/lib/typescript.js';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(directory,'../..');
const options={target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,moduleResolution:ts.ModuleResolutionKind.Node10,strict:true,skipLibCheck:true,esModuleInterop:true,rootDir:root,outDir:path.join(directory,'node_modules/.cache/build'),types:['node'],lib:['lib.es2022.d.ts','lib.dom.d.ts']};
const program=ts.createProgram([path.join(directory,'server.ts')],options);const diagnostics=ts.getPreEmitDiagnostics(program);if(diagnostics.length){console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:f=>f,getNewLine:()=> '\n'}));process.exitCode=1;}else{program.emit();console.log('Agent 0 offline build passed. No acquisition or deployment.');}
