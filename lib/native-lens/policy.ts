/** C's isolated UI lane. No old grant/carrier selects or authorizes this policy. */
export const NATIVE_LENS_BRANCH='integration/281-native-first';
export const NATIVE_LENS_CORRECTION_BRANCH='integration/284-native-corrections';
export {NATIVE_RUNTIME_BRANCH} from '../native-pilot/runtime/build';
// A compiled installation only makes the route reachable. Actual acquisition still
// needs BOTH immutable setup AND a separate finite owner-reviewed source admission.
export {NATIVE_RUNTIME_INSTALLED as NATIVE_LENS_SOURCE_ENABLED} from '../native-pilot/runtime/build';
