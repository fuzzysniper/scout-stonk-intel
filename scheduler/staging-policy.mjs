import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';

// Strict policy for this one inactive package, not a generic Wrangler validator.
// Any additional surface/binding, even a new "env", requires a reviewed change.
export const stagingConfig = {
 $schema: './node_modules/wrangler/config-schema.json',
 name: 'scout-scheduler-staging', main: 'staging-entry.ts', compatibility_date: '2026-10-01',
 workers_dev: false, preview_urls: false,
 vars: { ACTIVATION: 'disabled', APP_ID: '5310753', INSTALLATION_ID: '171233795', REPOSITORY_ID: '1415026436' },
 durable_objects: { bindings: [{ name: 'SLOTS', class_name: 'SlotCoordinator' }] },
 exports: { SlotCoordinator: { type: 'durable-object', storage: 'sqlite' } },
};
export function assertInactiveConfig(config) {
 // Do not include the rejected config in diagnostics: it may contain an accidental secret.
 assert.ok(isDeepStrictEqual(config, stagingConfig), 'Inactive staging configuration changed; stop for human review');
}
export const dryRunArguments = (configPath, outputPath) => [
 'deploy', '--dry-run', '--config', configPath, '--outdir', outputPath,
];
