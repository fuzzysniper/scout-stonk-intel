#!/usr/bin/env python3
"""Fixed-file, metadata-only offline report. No HTTP, clocks-as-observations or writes."""
import datetime as dt
import json
import pathlib
import sys

from scripts import coverage_candidates as c

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'research/reward-candidates.json'
EVIDENCE = ROOT / 'docs/evidence/pair-reward-audit-2026-10-14.json'
EVIDENCE_REVISION = 'sha256:4ff3c223122ca1479bade0e09889aa4837803cab137c26a9e714999a2ea0b50d'


def read_bounded(path, limit):
    with path.open('rb') as f:
        raw = f.read(limit + 1)
    c.need(len(raw) <= limit, 'document_limit')
    return raw


def retained_inputs(catalog_bytes, evidence_bytes):
    catalog = c.decode(catalog_bytes, 32 * 1024)
    rows = c.validate_catalog(catalog)
    c.need(c.sha(evidence_bytes) == EVIDENCE_REVISION, 'retained_document_changed')
    document = c.decode(evidence_bytes, 1024 * 1024)
    c.need(catalog['sourceEvidence'] == {'path': str(EVIDENCE.relative_to(ROOT)), 'commit': 'df4e87658c5dd64fef9461d174333d824c8b1c7c', 'revision': EVIDENCE_REVISION, 'asOf': document['asOf']}, 'catalog_provenance_changed')
    captures = document.get('packets')
    c.need(isinstance(captures, list) and len(captures) <= 32, 'receipt_limit')
    indices = sorted({index for row in rows for index in row['evidence'].values()})
    c.need(len(indices) <= c.POLICY['requests'] and all(i < len(captures) for i in indices), 'request_budget')
    packets = []
    for index in indices:
        p = captures[index]
        raw = p['body'].encode('utf-8')
        c.need(p['bytes'] == len(raw) and 'sha256:' + p['bodySha256'] == c.sha(raw), 'retained_receipt_changed')
        packets.append({'source': c.ORIGIN + p['path'], 'capturedAt': p['capturedAt'],
                        'status': p['status'], 'headers': p['headers'], 'body': raw})
    # Each index must identify the seed's actual exact-mint path, not just some valid receipt.
    for row in rows:
        for key, source in [('registryPacket', c.REGISTRY), ('catalogPacket', c.CATALOG + row['quoteMint']), ('rewardsPacket', c.REWARDS + row['mint'] + '/rewards')]:
            c.need(c.ORIGIN + captures[row['evidence'][key]]['path'] == source, 'candidate_receipt_mismatch')
    # The old audit's millisecond asOf truncates the last microsecond capture by
    # 82us. Use the latest ORIGINAL capture as the offline validation boundary;
    # never retime a receipt or relax the no-future-source gate.
    validation_as_of = max([document['asOf']] + [p['capturedAt'] for p in packets], key=c.time)
    return catalog, packets, validation_as_of


def report(catalog_bytes, evidence_bytes, as_of):
    catalog, packets, captured_as_of = retained_inputs(catalog_bytes, evidence_bytes)
    selected = [row['mint'] for row in catalog['candidates']]
    historic = c.evaluate(catalog, selected, packets, captured_as_of, opt_in=True, request_budget=21)
    c.need(historic['state'] == 'validated_offline', 'retained_identity_validation_failed')
    current = c.evaluate(catalog, selected, packets, as_of, opt_in=True, request_budget=21)
    # Rights are always withheld. Neither opt-in nor replay grants publication rights.
    return {'kind': 'offline_candidate_source_index', 'activation': 'disabled', 'requestsMade': 0,
            'reportEvaluatedAt': as_of, 'originalAuditAsOf': catalog['sourceEvidence']['asOf'],
            'originalReceiptValidationAsOf': captured_as_of,
            'sourceEvidence': catalog['sourceEvidence'], 'rights': dict(c.RIGHTS),
            'candidates': [{'mint': candidate['mint'], 'symbol': candidate['symbol'],
                            'quoteMint': candidate['quoteMint'], 'quoteSymbol': candidate['quoteSymbol'],
                            'quoteDecimals': candidate['quoteDecimals'],
                            'quoteSymbolAmbiguous': candidate['quoteSymbolAmbiguous'],
                            'mode': 'verified_at_capture', 'temporalState': 'historical_not_current',
                            'currentGate': next(r['reason'] for r in current['rows'] if r['mint'] == candidate['mint']),
                            'lifetime': None, 'recentFlow': None, 'holderReturn': None,
                            'financialPublication': 'withheld'} for candidate in catalog['candidates']],
            'complete': False, 'atomic': False, 'ranking': None,
            'promotion': 'separate_owner_review_and_implementation_required'}


def main():
    try:
        c.need(sys.argv[1:] == ['--offline-report'], 'offline_report_only')
        now = dt.datetime.now(dt.timezone.utc).isoformat()
        value = report(read_bounded(CATALOG, 32 * 1024), read_bounded(EVIDENCE, 1024 * 1024), now)
        print(json.dumps(value, indent=2, ensure_ascii=False))
        return 0
    except Exception:
        print(json.dumps({'kind': 'offline_candidate_source_index', 'activation': 'disabled',
                          'state': 'unavailable', 'reason': 'candidate_evidence_unavailable',
                          'requestsMade': 0, 'candidates': [], 'financialPublication': 'withheld'}))
        return 1


if __name__ == '__main__':
    sys.exit(main())
