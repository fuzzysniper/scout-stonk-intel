#!/usr/bin/env python3
"""Offline, deterministic default-OFF pack/verify. No extraction, network or code import."""
import hashlib
import io
import json
import os
from pathlib import Path
import re
import stat
import sys
import zipfile

PREFIX = '.vercel/output/'
MAX_TOTAL = 16 * 1024 * 1024
FUNC = 'functions/_ops/neon-smoke.func/'
CONFIG = {'version': 3, 'routes': [{'src': '^/_ops/neon-smoke$', 'dest': '/_ops/neon-smoke'},
                                  {'handle': 'filesystem'}, {'src': '/.*', 'status': 404}]}
VC = {'runtime': 'nodejs24.x', 'handler': 'handler.mjs', 'launcherType': 'Nodejs',
      'maxDuration': 10, 'shouldAddHelpers': True, 'shouldAddSourcemapSupport': False}


def need(condition):
    if not condition:
        raise ValueError('artifact_unverified')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def pairs_unique(pairs):
    result = {}
    for key, value in pairs:
        need(key not in result)
        result[key] = value
    return result


def check_files(files, commit):
    need(6 <= len(files) <= 512 and sum(map(len, files.values())) <= MAX_TOTAL)
    for name, data in files.items():
        need(name and name.isascii() and not name.startswith('/') and '\\' not in name and len(data) <= 1048576)
        need(all(p not in ('', '.', '..', '.git', '.neon', '.vercel', '.npmrc', '.netrc', '.git-credentials', 'auth.json') and not p.startswith('.env') and
                 not p.endswith(('.pem', '.key')) for p in name.split('/')))
        need(name == 'config.json' or name.startswith(FUNC))
        need(not re.search(rb'-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----', data))
        need(not re.search(rb'https://mainnet\.helius-rpc\.com/\?api-key=[a-zA-Z0-9_-]{8,}', data))
    def js(name):
        return json.loads(files[name].decode('utf-8'), object_pairs_hook=pairs_unique)
    need(js('config.json') == CONFIG and js(FUNC + '.vc-config.json') == VC)
    approval = js(FUNC + 'approval.json')
    need(list(approval) == ['enabled'] and approval['enabled'] is False)
    artifact = js(FUNC + 'artifact.json')
    need(artifact['version'] == 'scout-neon-artifact/2' and artifact['sourceClean'] is True)
    need(re.fullmatch('[0-9a-f]{40}', artifact['sourceCommit']) is not None)
    need(commit is None or artifact['sourceCommit'] == commit)
    need(re.fullmatch('[0-9a-f]{64}', artifact['lockSha256']) is not None)
    need(artifact['sources'] == [{'path': name, 'sha256': sha(files[FUNC + name])}
                                for name in ['handler.mjs', 'scout-neon-smoke.mjs']])
    packages = artifact['packages']
    need(isinstance(packages, list) and len(packages) == len({p['name'] for p in packages}))
    need(any(p == {'name': 'pg', 'version': '8.23.1'} for p in packages))
    for p in packages:
        name = p['name']
        need(all(part not in ('.', '..') for part in name.split('/')))
        need(re.fullmatch(r'(?:@[a-z0-9._-]+/)?[a-z0-9._-]+', name) is not None)
        installed = js(FUNC + 'node_modules/' + name + '/package.json')
        need(installed['name'] == name and installed['version'] == p['version'])
    fixed = {FUNC + name for name in ['handler.mjs', 'scout-neon-smoke.mjs', '.vc-config.json',
                                      'approval.json', 'artifact.json']}
    for name in files:
        need(name == 'config.json' or name in fixed or any(
            name.startswith(FUNC + 'node_modules/' + p['name'] + '/') for p in packages))
    inventory = [{'path': name, 'sha256': sha(data), 'bytes': len(data)} for name, data in sorted(files.items())]
    inventory_digest = sha(json.dumps(inventory, separators=(',', ':'), ensure_ascii=True).encode())
    return {'files': len(files), 'filesSha256': inventory_digest, 'sourceCommit': artifact['sourceCommit'],
            'approvalEnabled': False, 'runtime': VC['runtime']}


def canonical_zip(files):
    # Fixed ordering/time/mode/compression; no local paths, build clock or UID leaks.
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', compression=zipfile.ZIP_STORED) as z:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(PREFIX + name, date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | 0o644) << 16
            z.writestr(info, data)
    return buf.getvalue()


def pack(root, destination):
    root = Path(root)
    need(root.is_dir() and not root.is_symlink())
    files = {}
    total = 0
    for parent, dirs, names in os.walk(root, followlinks=False):
        for name in dirs + names:
            need(not (Path(parent) / name).is_symlink())
        for name in names:
            p = Path(parent) / name
            info = p.stat()
            total += info.st_size
            need(stat.S_ISREG(info.st_mode) and info.st_size <= 1048576 and len(files) < 512 and total <= MAX_TOTAL)
            files[p.relative_to(root).as_posix()] = p.read_bytes()
    result = check_files(files, None)
    raw = canonical_zip(files)
    need(len(raw) <= MAX_TOTAL)
    with open(destination, 'xb') as out:
        out.write(raw)
    return {**result, 'zipSha256': sha(raw), 'zipBytes': len(raw)}


def verify(path, expected_zip, expected_inventory, commit):
    need(all(re.fullmatch('[0-9a-f]{64}', s) is not None for s in [expected_zip, expected_inventory]))
    need(re.fullmatch('[0-9a-f]{40}', commit) is not None and Path(path).stat().st_size <= MAX_TOTAL)
    raw = Path(path).read_bytes()
    need(sha(raw) == expected_zip)
    files = {}
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        need(not z.comment and 6 <= len(z.infolist()) <= 512)
        need([i.filename for i in z.infolist()] == sorted(i.filename for i in z.infolist()))
        for i in z.infolist():
            need(i.filename.startswith(PREFIX) and i.compress_type == zipfile.ZIP_STORED and
                 not i.extra and not i.comment and not i.flag_bits & 1 and
                 i.date_time == (1980, 1, 1, 0, 0, 0) and i.create_system == 3 and
                 i.external_attr >> 16 == stat.S_IFREG | 0o644 and i.file_size <= 1048576)
            name = i.filename[len(PREFIX):]
            need(name not in files and sum(map(len, files.values())) + i.file_size <= MAX_TOTAL)
            files[name] = z.read(i)
    need(canonical_zip(files) == raw)  # Reject hidden prefix/trailer/local-header payloads too.
    result = check_files(files, commit)
    need(result['filesSha256'] == expected_inventory)
    return {**result, 'zipSha256': sha(raw), 'verified': True}


if __name__ == '__main__':
    try:
        if len(sys.argv) == 4 and sys.argv[1] == 'pack':
            result = pack(*sys.argv[2:])
        elif len(sys.argv) == 6 and sys.argv[1] == 'verify':
            result = verify(*sys.argv[2:])
        else:
            raise ValueError('invalid_command')
        print(json.dumps(result, separators=(',', ':')))
    except Exception:
        print('FAIL: default-OFF artifact integrity unproven; do not deploy.', file=sys.stderr)
        sys.exit(1)
