import fs from 'node:fs';
import path from 'node:path';
import { approve } from './approval';
import { runPipeline } from './pipeline';
import { createPublicReader, transportPreflight } from './transport';
import { LIMITS, SCOPE, Stop, need, sha } from './policy';
const disabled = 'DISABLED. Requires separate founder approval. No RPC performed. See experiments/agent-zero-onchain/README.md.';
function outsideGit(directory: string) {
  let cursor = fs.realpathSync(directory);
  for (;;) { need(!fs.existsSync(path.join(cursor, '.git')), 'PRIVATE_PATH_MUST_BE_OUTSIDE_GIT'); const parent = path.dirname(cursor); if (parent === cursor) return; cursor = parent; }
}
function writeExclusive(file: string, bytes: string | Uint8Array) {
  const fd = fs.openSync(file, 'wx', 0o600); try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
/** CLI only. Importing this module, --help and default invocation acquire nothing. */
export async function main(args: string[]): Promise<number> {
  if (!args.length || args.length === 1 && args[0] === '--help') { console.log(disabled); return 0; }
  let evidenceDirectory: string | null = null;
  try {
    need(args.length === 2 && args[0] === '--one-shot-dev-probe' && path.isAbsolute(args[1]), 'EXPLICIT_OPT_IN_AND_ABSOLUTE_APPROVAL_REQUIRED');
    const approvalPath = args[1]; outsideGit(path.dirname(approvalPath));
    const stat = fs.lstatSync(approvalPath); need(stat.isFile() && !stat.isSymbolicLink() && stat.size <= LIMITS.approvalBytes, 'APPROVAL_FILE');
    const fd = fs.openSync(approvalPath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    let approvalBytes: Buffer; try { need(fs.fstatSync(fd).size <= LIMITS.approvalBytes, 'APPROVAL_SIZE'); const buffer = Buffer.alloc(LIMITS.approvalBytes + 1); const count = fs.readSync(fd, buffer); need(count <= LIMITS.approvalBytes, 'APPROVAL_SIZE'); approvalBytes = buffer.subarray(0, count); } finally { fs.closeSync(fd); }
    const approval = approve(approvalBytes, new Date().toISOString());
    need(path.isAbsolute(approval.evidenceDirectory), 'PRIVATE_DIRECTORY_ABSOLUTE'); outsideGit(path.dirname(approval.evidenceDirectory));
    transportPreflight(); // Do not bypass cloud/corporate proxies or weakened TLS.
    // Permanent approval-path claim: never reset after errors/timeout or reuse this file.
    writeExclusive(approvalPath + '.spent', JSON.stringify({ at: new Date().toISOString(), approvalSha256: sha(approvalBytes), scope: SCOPE }) + '\n');
    fs.mkdirSync(approval.evidenceDirectory, { mode: 0o700 }); // Existing output directories fail; no overwrites.
    evidenceDirectory = fs.realpathSync(approval.evidenceDirectory); outsideGit(evidenceDirectory);
    writeExclusive(path.join(evidenceDirectory, 'approval.json'), approvalBytes);
    const result = await runPipeline({
      reserve: (attempt, requestBody) => { approve(approvalBytes, new Date().toISOString()); writeExclusive(path.join(evidenceDirectory!, 'attempt-' + attempt + '.json'), JSON.stringify({ attempt, reservedAt: new Date().toISOString(), requestBody, requestSha256: sha(requestBody), scope: SCOPE }) + '\n'); },
      read: createPublicReader(approval),
      retain: (attempt, capture) => {
        writeExclusive(path.join(evidenceDirectory!, 'response-' + attempt + '.bin'), capture.body);
        const { body, ...metadata } = capture;
        writeExclusive(path.join(evidenceDirectory!, 'response-' + attempt + '.json'), JSON.stringify({ ...metadata, bodyBytes: body.length, responseSha256: sha(body) }) + '\n');
      },
      now: () => new Date().toISOString(),
    });
    writeExclusive(path.join(evidenceDirectory, 'result.json'), JSON.stringify({ execution: 'OWNER_AUTHORIZED_MANUAL_PUBLIC_RPC_DEVELOPMENT', reviewedCommitOwnerAttestation: approval.reviewedCommit, reviewedCommitIndependentlyVerified: false, ...result }, null, 2) + '\n');
    console.log(result.accepted ? 'RPC-reported finalized reserve observation retained privately. This is not a fill, recommendation or independent chain replay.' : 'STOPPED: ' + result.reason + '. No accepted market price; approval consumed.');
    console.log('Attempts reserved: ' + result.attemptsReserved + '/2. Evidence: ' + evidenceDirectory);
    return result.accepted ? 0 : 1;
  } catch (error) {
    console.error('STOPPED: ' + (error instanceof Stop ? error.code : 'LOCAL_PREFLIGHT_OR_PERSISTENCE_FAILURE') + '. No retry. Preserve any .spent marker and private evidence.');
    return 1;
  }
}
if (require.main === module) void main(process.argv.slice(2)).then(code => { process.exitCode = code; });
