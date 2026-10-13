// Credential-free, fixed dry-run only. No passthrough flags or remote deploy script.
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { promisify } from 'node:util';
import { assertInactiveConfig, dryRunArguments } from './staging-policy.mjs';

export async function dryRun() {
 if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Wrangler requires Node >=22; app CI remains Node 20');
 const root = fileURLToPath(new URL('.', import.meta.url));
 const config = JSON.parse(await readFile(join(root, 'wrangler.json'), 'utf8'));
 assertInactiveConfig(config);
 const require = createRequire(import.meta.url);
 const cli = join(dirname(require.resolve('wrangler/package.json')), 'bin', 'wrangler.js');
 const directory = await mkdtemp(join(tmpdir(), 'scout-staging-dry-run-'));
 try {
  // Isolate dotenv/profile discovery from the repository and any local account files.
  const configPath = join(directory, 'wrangler.json');
  await writeFile(configPath, JSON.stringify({ ...config, main: join(root, config.main) }));
  const permitted = 'PATH Path SystemRoot SYSTEMROOT SystemDrive COMSPEC PATHEXT TMP TEMP TMPDIR HTTP_PROXY HTTPS_PROXY ALL_PROXY NO_PROXY http_proxy https_proxy all_proxy no_proxy NODE_EXTRA_CA_CERTS SSL_CERT_FILE SSL_CERT_DIR CURL_CA_BUNDLE REQUESTS_CA_BUNDLE'.split(' ');
  const environment = Object.fromEntries(permitted.filter(name => process.env[name] !== undefined).map(name => [name, process.env[name]]));
  Object.assign(environment, { WRANGLER_SEND_METRICS: 'false', CI: 'true', XDG_CONFIG_HOME: join(directory, 'config'), WRANGLER_LOG_PATH: join(directory, 'logs') });
  const result = await promisify(execFile)(process.execPath, [cli, ...dryRunArguments(configPath, join(directory, 'bundle'))],
   { cwd: directory, env: environment, timeout: 60_000, maxBuffer: 1024 * 1024 });
  const bundle = await readFile(join(directory, 'bundle', config.main.replace(/\.ts$/, '.js')), 'utf8');
  if (!bundle.includes('SlotCoordinator') || !bundle.includes('CREATE TABLE IF NOT EXISTS slots')) throw new Error('missing_sqlite_coordinator_bundle');
  return { ...result, bundle };
 } finally { await rm(directory, { recursive: true, force: true }); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
 if (process.argv.length !== 2) throw new Error('dry_run_accepts_no_arguments');
 const result = await dryRun();
 process.stdout.write(result.stdout);
 process.stderr.write(result.stderr);
 process.stdout.write('Inactive staging bundle verified; temporary output removed. No deployment performed.\n');
}
