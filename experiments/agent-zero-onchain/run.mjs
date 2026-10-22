// Portable Node 20 owner-PC launcher. No shell, network, installs or environment activation.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
const args = process.argv.slice(2);
if (!args.length || args.length === 1 && args[0] === '--help') {
  console.log('DISABLED. No RPC performed. Review README.md; separate founder approval is required.');
} else if (args.length !== 2 || args[0] !== '--one-shot-dev-probe' || !path.isAbsolute(args[1])) {
  console.error('STOPPED. Only --one-shot-dev-probe <absolute-owner-approval.json> is supported.'); process.exitCode = 1;
} else {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), build = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-pump-probe-'));
  try {
    const compiled = spawnSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), 'experiments/agent-zero-onchain/cli.ts', '--resolveJsonModule', '--target', 'ES2022', '--module', 'commonjs', '--moduleResolution', 'node', '--strict', '--skipLibCheck', '--esModuleInterop', '--rootDir', '.', '--outDir', build], { cwd: root, stdio: 'inherit' });
    if (compiled.status !== 0) process.exitCode = 1;
    else process.exitCode = spawnSync(process.execPath, [path.join(build, 'experiments/agent-zero-onchain/cli.js'), ...args], { cwd: root, stdio: 'inherit' }).status ?? 1;
  } finally { fs.rmSync(build, { recursive: true, force: true }); } // Compiled temp only; never evidence/claims.
}
