/** OFFLINE ONLY. Supported Miniflare/workerd runtime + mocked GitHub transport.
 * /proc measures aggregate user+system CPU, not Cloudflare billable invocation CPU.
 * No live provider/API, credential, scheduler or account is used.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { cpus, arch, platform } from 'node:os';
import { performance } from 'node:perf_hooks';
import { harness, AT } from '../tests/scheduler-harness.mjs';

const ticks = Number(execFileSync('getconf', ['CLK_TCK'], { encoding: 'utf8' }).trim());
function runtimePid() {
  const rows = execFileSync('ps', ['-C', 'workerd', '-o', 'pid=,ppid='], { encoding: 'utf8' }).trim().split('\n');
  const matches = rows.map(row => row.trim().split(/\s+/).map(Number)).filter(row => row[1] === process.pid);
  if (matches.length !== 1) throw new Error('benchmark_runtime_pid_ambiguous');
  return matches[0][0];
}
function cpu(pid) {
  const fields = readFileSync(`/proc/${pid}/stat`, 'utf8').split(') ')[1].split(' ');
  return (Number(fields[11]) + Number(fields[12])) * 1000 / ticks;
}
async function batch(h, pid, count, url, body, reply = 'action') {
  const start = performance.now(), before = cpu(pid);
  const parentBefore = process.cpuUsage();
  for (let i = 0; i < count; i++) {
    const response = await h.mf.dispatchFetch(`${url}${url.includes('?') ? '&' : '?'}coordinator=benchmark-${i}`, {
      method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
    });
    if (response.status !== 200) throw new Error('benchmark_request_failed');
    if (reply === 'scheduled') {
      if ((await response.text()) !== 'scheduled') throw new Error('benchmark_scheduled_failed');
    } else if (body && (await response.json()).action !== 'accepted') throw new Error('benchmark_not_accepted');
    else if (!body) await response.arrayBuffer(); // Discard mock JWT. Never print/write it.
  }
  const workerdCpuMs = cpu(pid) - before;
  const parent = process.cpuUsage(parentBefore);
  return { count, workerd_cpu_ms: workerdCpuMs, workerd_cpu_ms_per_operation: workerdCpuMs / count,
    node_harness_cpu_ms: (parent.user + parent.system) / 1000, wall_ms: performance.now() - start };
}
const results = [];
for (let i = 0; i < 5; i++) {
  const start = performance.now();
  const h = await harness();
  try {
    await h.mf.ready;
    const readinessWallMs = performance.now() - start;
    const pid = runtimePid();
    results.push({ readiness_wall_ms: readinessWallMs, startup_workerd_cpu_ms: cpu(pid),
      first_sqlite_dispatch: await batch(h, pid, 1, 'https://test.invalid/', { operation: 'tick', scheduledTime: AT }) });
  } finally { await h.close(); }
}
const h = await harness();
let warm;
try {
  await h.mf.ready;
  const pid = runtimePid();
  await batch(h, pid, 5, 'https://test.invalid/jwt');
  warm = { signing: await batch(h, pid, 200, 'https://test.invalid/jwt'),
    fresh_sqlite_dispatch: await batch(h, pid, 100, 'https://test.invalid/', { operation: 'tick', scheduledTime: AT }),
    same_slot_duplicate: await batch(h, pid, 100, 'https://test.invalid/', { operation: 'tick', scheduledTime: AT }) };
  await batch(h, pid, 1, 'https://test.invalid/scheduled', { scheduledTime: AT, cron: '17 * * * *' }, 'scheduled');
  warm.scheduled_same_slot = await batch(h, pid, 100, 'https://test.invalid/scheduled', { scheduledTime: AT, cron: '17 * * * *' }, 'scheduled');
} finally { await h.close(); }
const result = { measured_at: new Date().toISOString(), node: process.version, miniflare: '3.20250718.3',
  workerd: JSON.parse(readFileSync(new URL('../node_modules/workerd/package.json', import.meta.url))).version,
  compatibility_date: '2025-07-18', platform: platform(), arch: arch(), cpu_model: cpus()[0].model,
  clock_ticks_per_second: ticks, ephemeral_rsa_bits: 2048, cold_samples: results, warm,
  limitations: ['Synthetic 2099 trigger metadata and in-memory mock key; no real data/credentials/API calls.',
    'Aggregate workerd process CPU includes test facade, HTTP, SQLite, crypto and runtime/proxy overhead; Node mock CPU separate.',
    'CPU resolution is OS clock ticks, not per-invocation Cloudflare metering. Wall time includes mock I/O.',
    'Cron Worker forwards to Durable Object; signing runs inside DO. Aggregate CPU cannot separate their billable limits.',
    'Fresh objects isolate cold ledger work; production has one singleton. Cold startup differs from Cloudflare edge/account.',
    'Local compatibility date/version pinned for Node 20 CI; not proof of current hosted limits or reliability.'] };
const output = process.argv[2];
if (!output) throw new Error('output_path_required');
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(`Wrote offline CPU evidence to ${output}`);
