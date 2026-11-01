// PostgreSQL18 WASM grammar only: no server, connection, query execution or SQL client.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {parse,parsePlPgSQL} from '../../experiments/jupiter-beta-approval/integration/node_modules/libpg-query/wasm/index.js';
try{
 const sql=fs.readFileSync(process.argv[2]||'experiments/jupiter-beta-approval/integration/durable/schema.sql','utf8');
 const ast=await parse(sql),pl=await parsePlPgSQL(sql);assert.ok(ast.version>=180000&&ast.stmts.length>=30);assert.ok(JSON.stringify(pl).includes('PLpgSQL_function'));
 console.log(JSON.stringify({postgresGrammar:ast.version,statements:ast.stmts.length,plpgsql:true,sqlExecuted:false}));process.exit(0);
}catch{console.error('offline_postgres_grammar_rejected');process.exit(1);}
