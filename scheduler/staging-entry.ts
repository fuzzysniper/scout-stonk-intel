/** Deployment-only exports. Keep helper constants/functions internal to the bundle:
 * current Workers requires entrypoint exports to be handlers/classes, not TARGET.
 * The actual coordinator and disabled scheduled handler are reused unchanged.
 */
export { SlotCoordinator } from './worker';
export { default } from './worker';
