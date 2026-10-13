import assert from 'node:assert/strict';

// Strict policy for this one inactive package, not a generic Wrangler validator.
// Any additional surface/binding, even a new "env", requires a reviewed change.
export const stagingConfig = {
 $schema: './node_modules/wrangler/config-schema.json',
 name: 'scout-scheduler-staging', main: 'staging-entry.ts', compatibility_date: '2026-10-01',
 workers_dev: false, preview_urls: false,
 vars: { ACTIVATION: 'disabled' },
 durable_objects: { bindings: [{ name: 'SLOTS', class_name: 'SlotCoordinator' }] },
 exports: { SlotCoordinator: { type: 'durable-object', storage: 'sqlite' } },
};
export function assertInactiveConfig(config) {
 assert.deepEqual(config, stagingConfig, 'Inactive staging configuration changed; stop for human review');
}
export const dryRunArguments = (configPath, outputPath) => [
 'deploy', '--dry-run', '--config', configPath, '--outdir', outputPath,
];
