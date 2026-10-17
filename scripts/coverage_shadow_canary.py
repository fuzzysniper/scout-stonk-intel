"""Pure two-token, historical shadow rehearsal. No I/O, transport or live approval.

Byte artifacts contain restricted research quantities: never print/export them.
Only metadata() is suitable for the review report; rights remain unverified.
"""
from dataclasses import dataclass, field

from scripts import coverage_candidates as c

MINTS = ('6HU4CmRb15C2nQDx8Ld2f2W2wTdmog6aZiiXdrT5Pzi8',
         'HTmQz7My6MehV7bjhJ6jde8nDND1yvsz68d24LP7YgUQ')
CATALOG_REVISION = 'sha256:7334efa7ccaaa8cf54d0eeb864cc407a0a4ca419dca92f94cab47467c957f7c6'
LIMITS = {'tokens': 2, 'requests': 5, 'registryReads': 1, 'catalogReadsPerToken': 1,
          'rewardReadsPerToken': 1, 'concurrency': 1, 'runBytes': 832 * 1024,
          'pointsPerToken': 73, 'sourceSpanSeconds': 72 * 3600,
          'datasetBytes': 512 * 1024, 'summaryBytes': 16 * 1024,
          'versions': 74, 'directoryBytes': 40 * 1024 * 1024}
MEMBER_FIELDS = ('mint', 'symbol', 'quoteMint', 'quoteSymbol', 'quoteDecimals', 'quoteTokenProgram', 'poolMint')
KIND = 'scout_shadow_canary_v1'


@dataclass(frozen=True)
class Snapshot:
    dataset: bytes = field(repr=False)
    summary: bytes = field(repr=False)
    manifest: bytes = field(repr=False)


def context(cohort_bytes, catalog_bytes):
    c.need(type(catalog_bytes) is bytes, 'candidate_catalog_changed')
    c.need(c.sha(catalog_bytes) == CATALOG_REVISION, 'candidate_catalog_changed')
    catalog = c.decode(catalog_bytes, 32 * 1024)
    candidates = c.validate_catalog(catalog)
    members = [{k: r[k] for k in MEMBER_FIELDS} for r in candidates if r['mint'] in MINTS]
    c.need(tuple(r['mint'] for r in members) == MINTS, 'canary_identity_missing')
    expected = {'schemaVersion': 1, 'kind': 'scout_shadow_canary_proposal', 'activation': 'disabled',
                'ownerSelection': 'proposed_not_approved', 'currentEligibility': 'unverified',
                'selectionBasis': 'source_integrity_and_two_exact_quote_units',
                'candidateCatalogRevision': CATALOG_REVISION, 'rights': dict(c.RIGHTS),
                'members': members, 'limits': LIMITS,
                'liveCollector': {'state': 'inert_proposal_only', 'approvedPrivateRoot': None,
                                  'publicFinancialOutput': 'withheld',
                                  'requiresSeparateOwnerRightsSourceInfrastructureAndSchemaReview': True}}
    proposal = c.decode(cohort_bytes, 16 * 1024)
    # Canonical bytes distinguish bools from numbers and reject extra permission flags.
    c.need(c.canonical(proposal) == c.canonical(expected), 'inactive_cohort_changed')
    return catalog, members, c.sha(cohort_bytes)


def configurations(members):
    out = []
    for member in members:
        identity = {**member, 'network': 'mainnet-beta', 'integration': 'stonkfun',
                    'scope': 'provider_token_aggregate', 'mode': 'reward', 'basis': 'ledger'}
        out.append({'mint': member['mint'], 'kind': 'local_configuration_fingerprint',
                    'fingerprint': c.sha(c.canonical(identity)), 'providerEpoch': None})
    return out


def request_plan(cohort_bytes, catalog_bytes):
    catalog, _, _ = context(cohort_bytes, catalog_bytes)
    p = c.plan(catalog, list(MINTS), opt_in=True, request_budget=5)
    c.need(len(p['requests']) == 5, 'canary_request_budget')
    return p


def check_dataset(dataset_bytes, cohort_bytes, catalog_bytes):
    _, members, cohort_revision = context(cohort_bytes, catalog_bytes)
    d = c.decode(dataset_bytes, LIMITS['datasetBytes'])
    c.need(set(d) == {'schemaVersion', 'kind', 'evidenceUse', 'cohortRevision',
                     'candidateCatalogRevision', 'generation', 'previousDatasetRevision',
                     'configurations', 'history'}, 'invalid_shadow_schema')
    c.need(type(d['schemaVersion']) is int and d['schemaVersion'] == 1 and d['kind'] == KIND and
           d['evidenceUse'] == 'offline_retained_capture_rehearsal' and
           d['cohortRevision'] == cohort_revision and d['candidateCatalogRevision'] == CATALOG_REVISION,
           'shadow_context_mismatch')
    c.need(c.integer(d['generation'], LIMITS['versions'] - 1), 'version_capacity')
    c.need((d['generation'] == 0 and d['previousDatasetRevision'] is None) or
           (d['generation'] > 0 and c.hash_value(d['previousDatasetRevision'])), 'invalid_shadow_parent')
    c.need(c.canonical(d['configurations']) == c.canonical(configurations(members)), 'configuration_epoch_changed')
    c.validate_store(d['history'])
    tokens = d['history']['tokens']
    c.need(set(tokens) == (set(MINTS) if d['generation'] else set()), 'two_token_store_required')
    for member in members:
        points = tokens.get(member['mint'], [])
        c.need(len(points) == d['generation'] and len(points) <= LIMITS['pointsPerToken'], 'shadow_retention_capacity')
        for point in points:
            c.need(all(point[k] == member[k] for k in ('mint', 'quoteMint', 'quoteSymbol', 'quoteDecimals')),
                   'configuration_epoch_changed')
        if points:
            c.need((c.time(points[-1]['observedAt']) - c.time(points[0]['observedAt'])).total_seconds()
                   <= LIMITS['sourceSpanSeconds'], 'shadow_retention_capacity')
    return d


def _snapshot(dataset, accepted, source_window):
    dataset_bytes = c.canonical(dataset)
    history_bytes = c.canonical(dataset['history'])
    # This is an original-source window for replay matching, NOT a new run/observation.
    summary = {'schemaVersion': 1, 'kind': 'shadow_rehearsal_summary',
               'evidenceUse': 'offline_retained_capture_rehearsal',
               'expectedDatasetRevision': c.sha(dataset_bytes),
               'historyMatch': {'version': 1, 'startedAt': source_window[0], 'finishedAt': source_window[1],
                                'expectedDatasetRevision': c.sha(history_bytes), 'accepted': accepted}}
    summary_bytes = c.canonical(summary)
    manifest = {'schemaVersion': 1, 'kind': 'shadow_rehearsal_manifest',
                'generation': dataset['generation'], 'cohortRevision': dataset['cohortRevision'],
                'datasetRevision': c.sha(dataset_bytes), 'summaryRevision': c.sha(summary_bytes),
                'previousDatasetRevision': dataset['previousDatasetRevision']}
    c.need(len(dataset_bytes) <= LIMITS['datasetBytes'] and len(summary_bytes) <= LIMITS['summaryBytes'],
           'shadow_byte_capacity')
    return Snapshot(dataset_bytes, summary_bytes, c.canonical(manifest))


def initial_snapshot(cohort_bytes, catalog_bytes):
    _, members, cohort_revision = context(cohort_bytes, catalog_bytes)
    data = {'schemaVersion': 1, 'kind': KIND, 'evidenceUse': 'offline_retained_capture_rehearsal',
            'cohortRevision': cohort_revision, 'candidateCatalogRevision': CATALOG_REVISION,
            'generation': 0, 'previousDatasetRevision': None, 'configurations': configurations(members),
            'history': {'version': 1, 'kind': 'candidate_quote_ledger_v1', 'tokens': {}}}
    return _snapshot(data, [], (None, None))


def verify_snapshot(snapshot, cohort_bytes, catalog_bytes, previous_bytes=None):
    c.need(isinstance(snapshot, Snapshot), 'invalid_shadow_artifact')
    data = check_dataset(snapshot.dataset, cohort_bytes, catalog_bytes)
    summary = c.decode(snapshot.summary, LIMITS['summaryBytes'])
    manifest = c.decode(snapshot.manifest, 4096)
    c.need(set(summary) == {'schemaVersion', 'kind', 'evidenceUse', 'expectedDatasetRevision', 'historyMatch'}
           and type(summary['schemaVersion']) is int and summary['schemaVersion'] == 1
           and summary['kind'] == 'shadow_rehearsal_summary'
           and summary['evidenceUse'] == 'offline_retained_capture_rehearsal'
           and summary['expectedDatasetRevision'] == c.sha(snapshot.dataset), 'shadow_dataset_hash_mismatch')
    expected_manifest = {'schemaVersion': 1, 'kind': 'shadow_rehearsal_manifest',
                         'generation': data['generation'], 'cohortRevision': data['cohortRevision'],
                         'datasetRevision': c.sha(snapshot.dataset), 'summaryRevision': c.sha(snapshot.summary),
                         'previousDatasetRevision': data['previousDatasetRevision']}
    c.need(c.canonical(manifest) == c.canonical(expected_manifest) and
           snapshot.manifest == c.canonical(expected_manifest), 'shadow_manifest_mismatch')
    if data['generation']:
        c.need(previous_bytes is not None, 'shadow_parent_required')
        previous = check_dataset(previous_bytes, cohort_bytes, catalog_bytes)
        c.need(c.sha(previous_bytes) == data['previousDatasetRevision'] and
               previous['generation'] + 1 == data['generation'], 'shadow_parent_mismatch')
        for address in MINTS:
            old = previous['history']['tokens'].get(address, [])
            new = data['history']['tokens'][address]
            c.need(c.canonical(new[:-1]) == c.canonical(old), 'shadow_history_rewritten')
        proof = c.match_persistence(c.canonical(data['history']), c.canonical(summary['historyMatch']))
        c.need(proof['observationsMatched'] == 2 and
               {r['mint'] for r in summary['historyMatch']['accepted']} == set(MINTS), 'two_token_summary_required')
        captures = [at for address in MINTS for point in data['history']['tokens'][address][-1:]
                    for at in [point['observedAt']] + [source['capturedAt'] for source in point['identitySources']]]
        c.need(summary['historyMatch']['startedAt'] == min(captures, key=c.time) and
               summary['historyMatch']['finishedAt'] == max(captures, key=c.time), 'shadow_source_window_mismatch')
    else:
        c.need(previous_bytes is None and summary['historyMatch'] == {'version': 1, 'startedAt': None,
               'finishedAt': None, 'expectedDatasetRevision': c.sha(c.canonical(data['history'])),
               'accepted': []}, 'invalid_empty_shadow')
    return {'generation': data['generation'], 'datasetRevision': c.sha(snapshot.dataset),
            'summaryRevision': c.sha(snapshot.summary), 'manifestRevision': c.sha(snapshot.manifest),
            'diskOrHostedPersistenceProven': False, 'financialPublication': 'withheld'}


def prepare_snapshot(cohort_bytes, catalog_bytes, packets, as_of, previous_bytes, *, opt_in=False):
    if opt_in is not True:
        return {'state': 'inactive', 'artifact': None, 'requestsMade': 0}
    catalog, _, _ = context(cohort_bytes, catalog_bytes)
    previous = check_dataset(previous_bytes, cohort_bytes, catalog_bytes)
    p = request_plan(cohort_bytes, catalog_bytes)
    c.need(isinstance(packets, list) and len(packets) == 5 and
           all(isinstance(x, dict) and type(x.get('body')) is bytes for x in packets) and
           sum(len(x['body']) for x in packets) <= LIMITS['runBytes'],
           'canary_receipt_budget')
    result = c.evaluate(catalog, list(MINTS), packets, as_of, opt_in=True, request_budget=len(p['requests']))
    safe_rows = [{'mint': r['mint'], 'state': r['state'], 'reason': r['reason']} for r in result['rows']]
    if result['state'] != 'validated_offline':
        return {'state': 'withheld', 'artifact': None, 'requestsMade': 0, 'rows': safe_rows,
                'pause': result['pause']}
    history, statuses, accepted = previous['history'], [], []
    for row in result['rows']:
        history, status = c.append_offline(history, row['observation'], opt_in=True)
        statuses.append(status)
        accepted.append({k: row['observation'][k] for k in
                         ('mint', 'id', 'observedAt', 'providerGeneratedAt', 'receiptRevision')})
    if all(status in ('duplicate', 'duplicate_provider_snapshot') for status in statuses):
        return {'state': 'idempotent_replay', 'artifact': None, 'requestsMade': 0, 'rows': safe_rows}
    c.need(statuses == ['appended_offline', 'appended_offline'], 'mixed_new_and_cached_batch')
    data = {**previous, 'generation': previous['generation'] + 1,
            'previousDatasetRevision': c.sha(previous_bytes), 'history': history}
    captures = [packet['capturedAt'] for packet in packets]
    snapshot = _snapshot(data, accepted, (min(captures, key=c.time), max(captures, key=c.time)))
    verify_snapshot(snapshot, cohort_bytes, catalog_bytes, previous_bytes)
    return {'state': 'prepared_offline', 'artifact': snapshot, 'requestsMade': 0, 'rows': safe_rows}


def metadata(snapshot, cohort_bytes, catalog_bytes):
    """Fixed metadata projection. No raw counters, financial figures or flow."""
    data = check_dataset(snapshot.dataset, cohort_bytes, catalog_bytes)
    return {'schemaVersion': 1, 'kind': 'shadow_canary_review_metadata',
            'evidenceUse': 'offline_retained_capture_rehearsal',
            'activation': 'disabled', 'ownerSelection': 'proposed_not_approved',
            'currentEligibility': 'unverified', 'rights': dict(c.RIGHTS),
            'generation': data['generation'], 'datasetRevision': c.sha(snapshot.dataset),
            'summaryRevision': c.sha(snapshot.summary), 'manifestRevision': c.sha(snapshot.manifest),
            'configurations': data['configurations'],
            'sources': [{'mint': address, 'quoteMint': record['quoteMint'],
                         'observedAt': record['observedAt'], 'providerGeneratedAt': record['providerGeneratedAt'],
                         'receiptRevision': record['receiptRevision']} for address in MINTS
                        for record in data['history']['tokens'].get(address, [])[-1:]],
            'lifetime': None, 'recentFlow': None, 'holderReturn': None, 'ranking': None,
            'providerEpochVerified': False, 'servedRevisionVerified': False,
            'comprehensiveCoverage': False, 'atomicProviderSnapshot': False,
            'missedSlots': None, 'providerRequestsMade': 0, 'newObservationsCollected': 0}
