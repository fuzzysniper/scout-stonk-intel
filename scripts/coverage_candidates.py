"""Inactive StonkFun candidate validation. Pure inputs/outputs; NO HTTP or file I/O.

Opt-in permits offline evaluation only, never acquisition, publication or promotion.
V2 exact quote-ledger records are deliberately incompatible with v1 float history.
"""
import copy
import datetime as dt
import decimal
import hashlib
import json
import re
import unicodedata

ORIGIN = 'https://www.stonkfun.xyz'
REGISTRY = ORIGIN + '/api/public/v1/pairs'
CATALOG = ORIGIN + '/api/public/v1/tokens?sort=marketCap&page=1&pageSize=25&quoteMint='
REWARDS = ORIGIN + '/api/v2/tokens/'
POLICY = {'candidates': 16, 'quotes': 4, 'requests': 21, 'concurrency': 1,
          'registryBytes': 512 * 1024, 'catalogBytes': 128 * 1024,
          'rewardBytes': 32 * 1024, 'runBytes': 1536 * 1024,
          'pointsPerToken': 193, 'recordBytes': 2048, 'storeBytes': 7 * 1024 * 1024,
          'transportAgeSeconds': 300, 'ledgerAgeSeconds': 300, 'identityAgeSeconds': 10800}
PROGRAMS = ('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
RIGHTS = {'retention': 'unverified', 'financialPublication': 'withheld',
          'rawRedistribution': 'unverified', 'commercialUse': 'unverified'}
ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
SAFE = 2**53 - 1


class Rejected(ValueError):
    """Only fixed reason codes, never provider bodies, labels or exception text."""


def need(value, reason):
    if not value:
        raise Rejected(reason)


def mint(value):
    if not isinstance(value, str) or not 32 <= len(value) <= 44 or any(c not in ALPHABET for c in value):
        return False
    n = 0
    for c in value:
        n = n * 58 + ALPHABET.index(c)
    return len(value) - len(value.lstrip('1')) + (n.bit_length() + 7) // 8 == 32


def integer(value, maximum=SAFE):
    return type(value) is int and 0 <= value <= maximum


def text(value, maximum):
    return isinstance(value, str) and 0 < len(value) <= maximum and value == value.strip() and not any(unicodedata.category(c) in ('Cc', 'Cs') for c in value)


def time(value):
    need(isinstance(value, str) and re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)', value), 'invalid_time')
    try:
        return dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        raise Rejected('invalid_time') from None


def canonical(value):
    try:
        return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode('utf-8')
    except (ValueError, TypeError, UnicodeError, RecursionError):
        raise Rejected('invalid_serialization') from None


def sha(value):
    return 'sha256:' + hashlib.sha256(value).hexdigest()


def hash_value(value):
    return isinstance(value, str) and re.fullmatch(r'sha256:[a-f0-9]{64}', value) is not None


def decode(raw, limit):
    need(type(raw) is bytes and 0 < len(raw) <= limit, 'body_limit')
    def unique(pairs):
        out = {}
        for k, v in pairs:
            need(k not in out, 'duplicate_json_key')
            out[k] = v
        return out
    try:
        value = json.loads(raw.decode('utf-8', errors='strict'), object_pairs_hook=unique, parse_float=decimal.Decimal,
                           parse_constant=lambda _: (_ for _ in ()).throw(Rejected('invalid_json')))
        need(isinstance(value, dict), 'invalid_json')
        return value
    except (ValueError, UnicodeError, RecursionError):
        raise Rejected('invalid_json') from None


def validate_catalog(value):
    need(isinstance(value, dict) and set(value) == {'version', 'activation', 'purpose', 'sourceEvidence', 'rights', 'candidates'} and type(value.get('version')) is int and value['version'] == 1 and value.get('activation') == 'disabled' and value.get('purpose') == 'offline_candidate_review' and value.get('rights') == RIGHTS, 'inactive_catalog_required')
    rows = value.get('candidates')
    need(isinstance(rows, list) and 1 <= len(rows) <= POLICY['candidates'], 'candidate_limit')
    seen = set()
    for c in rows:
        need(isinstance(c, dict) and mint(c.get('mint')) and mint(c.get('quoteMint')) and mint(c.get('poolMint')), 'candidate_identity')
        need(c['mint'] not in seen, 'duplicate_candidate_mint')
        seen.add(c['mint'])
        need(text(c.get('symbol'), 32) and text(c.get('name'), 160) and text(c.get('quoteSymbol'), 32), 'candidate_labels')
        need(integer(c.get('quoteDecimals'), 18) and c.get('quoteTokenProgram') in PROGRAMS and type(c.get('quoteSymbolAmbiguous')) is bool, 'candidate_units')
        e = c.get('evidence')
        need(isinstance(e, dict) and set(e) == {'registryPacket', 'catalogPacket', 'rewardsPacket'} and all(integer(v, 31) for v in e.values()), 'candidate_evidence')
    need(len({c['quoteMint'] for c in rows}) <= POLICY['quotes'], 'quote_limit')
    return rows


def plan(value, selected, *, opt_in=False, request_budget=0):
    # Fail inactive before examining selection/receipts. Never changes a setting.
    if opt_in is not True:
        return {'state': 'inactive', 'executable': False, 'requests': [], 'candidates': []}
    rows = validate_catalog(value)
    need(isinstance(selected, list) and 1 <= len(selected) <= POLICY['candidates'] and all(mint(m) for m in selected), 'exact_mint_selection_required')
    need(len(set(selected)) == len(selected), 'duplicate_selection')
    by_mint = {c['mint']: c for c in rows}
    need(all(m in by_mint for m in selected), 'unknown_candidate')
    chosen = [copy.deepcopy(by_mint[m]) for m in sorted(selected)]
    requests = [REGISTRY] + [CATALOG + q for q in sorted({c['quoteMint'] for c in chosen})] + [REWARDS + c['mint'] + '/rewards' for c in chosen]
    need(integer(request_budget, POLICY['requests']) and len(requests) <= request_budget, 'request_budget')
    return {'state': 'offline_plan', 'executable': False, 'requests': requests, 'candidates': chosen}


def packet_read(packet, source, limit, as_of, max_age, *, envelope=True):
    need(isinstance(packet, dict) and packet.get('source') == source and type(packet.get('status')) is int and packet['status'] == 200, 'source_unavailable')
    captured = time(packet.get('capturedAt'))
    need(captured <= as_of, 'future_capture')
    need((as_of - captured).total_seconds() <= POLICY['transportAgeSeconds'], 'stale_capture')
    headers = packet.get('headers')
    need(isinstance(headers, dict) and isinstance(headers.get('content-type'), str) and re.fullmatch(r'application/json(?:\s*;.*)?', headers['content-type'], re.I), 'invalid_transport')
    need('content-range' not in headers and 'link' not in headers and not any(k in headers for k in ('location', 'refresh')), 'partial_or_redirect')
    for name in ('age', 'source-age'):
        age = headers.get(name)
        need(age is None or isinstance(age, str) and re.fullmatch(r'\d{1,6}', age) and int(age) <= POLICY['transportAgeSeconds'], 'stale_transport')
    value = decode(packet.get('body'), limit)
    need(value.get('error') is None, 'source_error')
    if envelope:
        need(isinstance(value.get('meta'), dict), 'invalid_provider_time')
    generated = value['meta'].get('generatedAt') if envelope else value.get('generatedAt')
    generated_time = time(generated)
    # New candidate policy permits no future generated clock or body retiming.
    need(generated_time <= captured, 'future_provider_clock')
    need(0 <= (as_of - generated_time).total_seconds() <= max_age, 'stale_provider')
    return value, {'source': source, 'capturedAt': packet['capturedAt'], 'providerGeneratedAt': generated, 'revision': sha(packet['body'])}


def registry_read(value):
    data = value.get('data')
    need(isinstance(data, dict) and data.get('selectBy') == 'mint', 'registry_identity')
    rows = data.get('pairs')
    need(isinstance(rows, list) and 1 <= len(rows) <= 1024, 'registry_limit')
    for parent in (value, data, value.get('meta', {})):
        need(isinstance(parent, dict), 'invalid_registry')
        need(all(parent.get(k) is None for k in ('pagination', 'page', 'nextCursor', 'nextPage', 'next')), 'partial_registry')
        need(all(parent.get(k) is None or parent[k] is False for k in ('hasMore', 'partial', 'truncated')), 'partial_registry')
        need(parent.get('complete') is None or parent['complete'] is True, 'partial_registry')
        for k in ('count', 'total', 'totalCount'):
            need(parent.get(k) is None or integer(parent[k], 1024) and parent[k] == len(rows), 'partial_registry')
    by_mint, symbols = {}, {}
    for row in rows:
        need(isinstance(row, dict) and mint(row.get('mint')) and row['mint'] not in by_mint, 'registry_identity')
        need(text(row.get('symbol'), 32) and text(row.get('name'), 160) and integer(row.get('decimals'), 18) and row.get('tokenProgram') in PROGRAMS and type(row.get('symbolAmbiguous')) is bool, 'registry_units')
        by_mint[row['mint']] = row
        symbols[row['symbol'].lower()] = symbols.get(row['symbol'].lower(), 0) + 1
    need(integer(data.get('ambiguousSymbolCount'), 1024) and data['ambiguousSymbolCount'] == sum(n > 1 for n in symbols.values()), 'registry_ambiguity')
    need(all(r['symbolAmbiguous'] == (symbols[r['symbol'].lower()] > 1) for r in rows), 'registry_ambiguity')
    return by_mint


def catalog_read(value, quote):
    data = value.get('data')
    need(isinstance(data, dict), 'invalid_catalog')
    rows, page = data.get('tokens'), data.get('pagination')
    need(isinstance(rows, list) and isinstance(page, dict), 'invalid_catalog')
    total = page.get('total')
    need(integer(total) and type(page.get('page')) is int and page['page'] == 1 and type(page.get('pageSize')) is int and page['pageSize'] == 25 and integer(page.get('totalPages')) and page['totalPages'] == (total + 24) // 25 and len(rows) == min(25, total), 'invalid_pagination')
    found = {}
    for r in rows:
        need(isinstance(r, dict) and mint(r.get('mint')) and r['mint'] not in found and mint(r.get('pool')), 'catalog_identity')
        need(text(r.get('symbol'), 32) and text(r.get('name'), 160) and r.get('mode') in ('reward', 'standard'), 'catalog_identity')
        q = r.get('quote')
        # A 200 alone never establishes that quoteMint was server-filtered.
        need(isinstance(q, dict) and q.get('mint') == quote['mint'] and q.get('symbol') == quote['symbol'], 'provider_filter_mismatch')
        found[r['mint']] = r
    return found, {'catalogEntriesInspected': len(rows), 'providerReportedAllModePools': total,
                   'uninspectedAllModePools': total - len(rows), 'complete': False, 'atomic': False}


def ledger_read(data, decimals, generated):
    need(data.get('basis') == 'ledger', 'ledger_basis_unverified')
    rewards = data.get('rewards')
    need(isinstance(rewards, dict), 'lifetime_unavailable')
    raw = rewards.get('distributedRaw')
    need(isinstance(raw, str) and 1 <= len(raw) <= 78 and re.fullmatch(r'0|[1-9]\d*', raw), 'invalid_raw_counter')
    count, wallets, last = rewards.get('payoutCount'), rewards.get('walletsPaid'), rewards.get('lastPayoutAt')
    need(integer(count) and integer(wallets) and wallets <= count and (int(raw) == 0 or count > 0 and wallets > 0), 'invalid_counts')
    need('lastPayoutAt' in rewards and (last is None and count == 0 or last is not None and count > 0 and time(last) <= time(generated)), 'invalid_payout_time')
    digits = raw.zfill(decimals + 1)
    # Ignore provider floating distributedTokens, including unsafe KNOTS rounding.
    amount = digits[:-decimals] + '.' + digits[-decimals:] if decimals else digits
    return {'distributedRaw': raw, 'distributedTokensExact': amount, 'payoutCount': count,
            'walletsPaid': wallets, 'lastPayoutAt': last}


def observation(candidate, data, source, identity_sources):
    record = {'version': 1, 'integration': 'stonkfun', 'network': 'mainnet-beta',
              'scope': 'provider_token_aggregate', 'mint': candidate['mint'],
              'quoteMint': candidate['quoteMint'], 'quoteSymbol': candidate['quoteSymbol'],
              'quoteDecimals': candidate['quoteDecimals'], 'mode': 'reward', 'basis': 'ledger',
              'observedAt': source['capturedAt'], 'providerGeneratedAt': source['providerGeneratedAt'],
              'source': source['source'], 'receiptRevision': source['revision'],
              'identitySources': copy.deepcopy(identity_sources),
              **ledger_read(data, candidate['quoteDecimals'], source['providerGeneratedAt'])}
    record['id'] = sha(canonical(record))
    need(len(canonical(record)) <= POLICY['recordBytes'], 'record_limit')
    return record


def evaluate(value, selected, packets, as_of, *, opt_in=False, request_budget=0):
    p = plan(value, selected, opt_in=opt_in, request_budget=request_budget)
    result = {'state': p['state'], 'activation': 'disabled', 'executable': False,
              'financialPublication': 'withheld', 'plannedRequests': len(p['requests']),
              'receiptsProvided': 0, 'requestsMade': 0, 'rows': [], 'coverage': {},
              'ranking': None, 'recentFlow': None, 'holderReturn': None, 'pause': None}
    if p['state'] == 'inactive':
        return result
    now = time(as_of)
    need(isinstance(packets, list) and len(packets) <= len(p['requests']), 'request_budget')
    sources, total_bytes = {}, 0
    for packet in packets:
        need(isinstance(packet, dict) and packet.get('source') in p['requests'] and packet['source'] not in sources, 'unexpected_or_duplicate_receipt')
        need(type(packet.get('body')) is bytes, 'invalid_body')
        limit = POLICY['registryBytes'] if packet['source'] == REGISTRY else POLICY['catalogBytes'] if packet['source'].startswith(CATALOG) else POLICY['rewardBytes']
        need(len(packet['body']) <= limit, 'body_limit')
        total_bytes += len(packet['body'])
        need(total_bytes <= POLICY['runBytes'], 'run_byte_limit')
        sources[packet['source']] = packet
    result['receiptsProvided'] = len(packets)
    # Rate/outage receipts pause the entire batch, with no retry or survivor list.
    for status, reason in ((429, 'provider_rate_limited'), (503, 'provider_unavailable')):
        failed = [x for x in packets if type(x.get('status')) is int and x['status'] == status]
        if failed:
            waits = [x['headers'].get('retry-after') if isinstance(x.get('headers'), dict) else None for x in failed]
            delays = [int(w) if isinstance(w, str) and re.fullmatch(r'[1-9]\d{0,3}', w) and int(w) <= 3600 else None for w in waits]
            result['pause'] = {'reason': reason, 'retryAfterSeconds': None if None in delays else max([60] + delays), 'retry': False}
            result['rows'] = [{'mint': c['mint'], 'state': 'withheld', 'reason': reason, 'observation': None} for c in p['candidates']]
            result['state'] = 'withheld'
            return result
    try:
        raw, registry_source = packet_read(sources.get(REGISTRY), REGISTRY, POLICY['registryBytes'], now, POLICY['identityAgeSeconds'])
        registry = registry_read(raw)
    except Rejected as error:
        result['state'] = 'withheld'
        result['rows'] = [{'mint': c['mint'], 'state': 'withheld', 'reason': str(error), 'observation': None} for c in p['candidates']]
        return result
    catalogs = {}
    for c in p['candidates']:
        row = {'mint': c['mint'], 'state': 'withheld', 'reason': None, 'mechanism': 'unverified', 'observation': None}
        try:
            q = registry.get(c['quoteMint'])
            need(q is not None and q['symbol'] == c['quoteSymbol'] and q['decimals'] == c['quoteDecimals'] and q['tokenProgram'] == c['quoteTokenProgram'] and q['symbolAmbiguous'] == c['quoteSymbolAmbiguous'], 'quote_units_mismatch')
            if c['quoteMint'] not in catalogs:
                url = CATALOG + c['quoteMint']
                catalog, catalog_source = packet_read(sources.get(url), url, POLICY['catalogBytes'], now, POLICY['identityAgeSeconds'])
                records, coverage = catalog_read(catalog, q)
                catalogs[c['quoteMint']] = (records, catalog_source)
                result['coverage'][c['quoteMint']] = coverage
            records, catalog_source = catalogs[c['quoteMint']]
            token = records.get(c['mint'])
            need(token is not None, 'not_in_bounded_catalog_sample')
            need(all(token[k] == c[ck] for k, ck in (('symbol', 'symbol'), ('name', 'name'), ('pool', 'poolMint'))), 'catalog_identity_mismatch')
            need(token['mode'] == 'reward', 'mode_changed')
            url = REWARDS + c['mint'] + '/rewards'
            data, source = packet_read(sources.get(url), url, POLICY['rewardBytes'], now, POLICY['ledgerAgeSeconds'], envelope=False)
            need(data.get('mint') == c['mint'] and data.get('mode') == 'reward', 'mode_or_mint_changed')
            quote = data.get('quote')
            need(isinstance(quote, dict) and quote.get('mint') == q['mint'] and quote.get('symbol') == q['symbol'] and type(quote.get('decimals')) is int and quote['decimals'] == q['decimals'], 'quote_units_mismatch')
            row['mechanism'] = 'settings_verified'
            row['observation'] = observation(c, data, source, [registry_source, catalog_source])
            row['state'] = 'validated_offline'
        except Rejected as error:
            row['reason'] = str(error)
        result['rows'].append(row)
    result['state'] = 'validated_offline' if all(r['observation'] is not None for r in result['rows']) else 'withheld'
    return result


def checked_record(record):
    need(isinstance(record, dict), 'invalid_observation')
    keys = {'version', 'integration', 'network', 'scope', 'mint', 'quoteMint', 'quoteSymbol', 'quoteDecimals', 'mode', 'basis', 'observedAt', 'providerGeneratedAt', 'source', 'receiptRevision', 'identitySources', 'distributedRaw', 'distributedTokensExact', 'payoutCount', 'walletsPaid', 'lastPayoutAt', 'id'}
    need(set(record) == keys and type(record['version']) is int and record['version'] == 1 and record['integration'] == 'stonkfun' and record['network'] == 'mainnet-beta' and record['scope'] == 'provider_token_aggregate', 'invalid_observation')
    need(mint(record['mint']) and mint(record['quoteMint']) and text(record['quoteSymbol'], 32) and integer(record['quoteDecimals'], 18) and record['mode'] == 'reward' and record['basis'] == 'ledger', 'invalid_observation')
    need(record['source'] == REWARDS + record['mint'] + '/rewards' and hash_value(record['receiptRevision']), 'invalid_observation_source')
    need(0 <= (time(record['observedAt']) - time(record['providerGeneratedAt'])).total_seconds() <= POLICY['ledgerAgeSeconds'], 'invalid_observation_time')
    sources = record['identitySources']
    need(isinstance(sources, list) and len(sources) == 2, 'invalid_observation_sources')
    for source, expected in zip(sources, (REGISTRY, CATALOG + record['quoteMint'])):
        need(isinstance(source, dict) and set(source) == {'source', 'capturedAt', 'providerGeneratedAt', 'revision'} and source['source'] == expected and hash_value(source['revision']), 'invalid_observation_sources')
        captured, generated = time(source['capturedAt']), time(source['providerGeneratedAt'])
        need(generated <= captured <= time(record['observedAt']) and (time(record['observedAt']) - captured).total_seconds() <= POLICY['transportAgeSeconds'] and (time(record['observedAt']) - generated).total_seconds() <= POLICY['identityAgeSeconds'], 'invalid_observation_sources')
    lifetime = ledger_read({'basis': 'ledger', 'rewards': record}, record['quoteDecimals'], record['providerGeneratedAt'])
    need(all(record[k] == v for k, v in lifetime.items()), 'invalid_observation')
    content = {k: v for k, v in record.items() if k != 'id'}
    need(record['id'] == sha(canonical(content)) and len(canonical(record)) <= POLICY['recordBytes'], 'invalid_observation_hash')


def validate_store(store):
    need(isinstance(store, dict) and set(store) == {'version', 'kind', 'tokens'} and type(store['version']) is int and store['version'] == 1 and store['kind'] == 'candidate_quote_ledger_v1' and isinstance(store['tokens'], dict), 'invalid_candidate_store')
    need(len(store['tokens']) <= POLICY['candidates'] and len(canonical(store)) <= POLICY['storeBytes'], 'retention_capacity')
    for address, history in store['tokens'].items():
        need(mint(address) and isinstance(history, list) and 1 <= len(history) <= POLICY['pointsPerToken'], 'invalid_candidate_store')
        previous = None
        for record in history:
            checked_record(record)
            need(record['mint'] == address, 'invalid_candidate_store')
            if previous is not None:
                sequence(previous, record)
            previous = record


def sequence(previous, record):
    for key in ('mint', 'quoteMint', 'quoteSymbol', 'quoteDecimals', 'mode', 'basis', 'scope'):
        need(previous[key] == record[key], 'configuration_epoch_changed')
    need(time(previous['observedAt']) < time(record['observedAt']), 'observation_clock_regressed')
    need(time(previous['providerGeneratedAt']) < time(record['providerGeneratedAt']), 'provider_clock_repeated_or_regressed')
    need(previous['receiptRevision'] != record['receiptRevision'], 'duplicate_receipt')
    for key in ('distributedRaw', 'payoutCount', 'walletsPaid'):
        need(int(previous[key]) <= int(record[key]), 'counter_reset_quarantined')
    need(previous['lastPayoutAt'] is None or record['lastPayoutAt'] is not None and time(previous['lastPayoutAt']) <= time(record['lastPayoutAt']), 'payout_clock_regressed')


def append_offline(store, record, *, opt_in=False):
    """Pure bounded draft persistence; never writes history or evicts old receipts."""
    if opt_in is not True:
        return store, 'inactive'
    validate_store(store)
    checked_record(record)
    history = store['tokens'].get(record['mint'], [])
    for old in history:
        if old['id'] == record['id'] and old == record:
            return store, 'duplicate'
        if time(old['observedAt']) == time(record['observedAt']):
            raise Rejected('conflicting_observation')
        if time(old['providerGeneratedAt']) == time(record['providerGeneratedAt']):
            need(old['receiptRevision'] == record['receiptRevision'], 'conflicting_provider_snapshot')
            need(all(old[k] == v for k, v in record.items() if k not in ('id', 'observedAt', 'identitySources')), 'conflicting_provider_snapshot')
            return store, 'duplicate_provider_snapshot'
    if history:
        sequence(history[-1], record)
    need(len(history) < POLICY['pointsPerToken'] and (record['mint'] in store['tokens'] or len(store['tokens']) < POLICY['candidates']), 'retention_capacity')
    out = copy.deepcopy(store)
    out['tokens'].setdefault(record['mint'], []).append(copy.deepcopy(record))
    need(len(canonical(out)) <= POLICY['storeBytes'], 'retention_capacity')
    return out, 'appended_offline'


def match_persistence(dataset_bytes, summary_bytes):
    """Independent byte-hash + exact appended-record match, not hosted/served proof."""
    dataset = decode(dataset_bytes, POLICY['storeBytes'])
    validate_store(dataset)
    summary = decode(summary_bytes, 16 * 1024)
    need(set(summary) == {'version', 'startedAt', 'finishedAt', 'expectedDatasetRevision', 'accepted'} and type(summary['version']) is int and summary['version'] == 1 and summary['expectedDatasetRevision'] == sha(dataset_bytes), 'dataset_revision_mismatch')
    start, finish = time(summary['startedAt']), time(summary['finishedAt'])
    need(0 <= (finish - start).total_seconds() <= 90, 'invalid_summary_window')
    accepted = summary['accepted']
    need(isinstance(accepted, list) and 1 <= len(accepted) <= POLICY['candidates'], 'invalid_summary')
    records = {history[-1]['id']: history[-1] for history in dataset['tokens'].values()}
    seen = set()
    for item in accepted:
        need(isinstance(item, dict) and set(item) == {'mint', 'id', 'observedAt', 'providerGeneratedAt', 'receiptRevision'} and hash_value(item.get('id')), 'invalid_summary')
        need(item['mint'] not in seen and item['id'] in records and all(records[item['id']][k] == v for k, v in item.items()) and start <= time(item['observedAt']) <= finish, 'summary_observation_mismatch')
        seen.add(item['mint'])
    return {'datasetHashMatched': True, 'observationsMatched': len(seen), 'servedRevisionVerified': False}
