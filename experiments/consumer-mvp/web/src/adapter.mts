import {explainMint as explainRetainedMint} from '../vendor/evidence/index';
import type {ExplainMint} from './evidence.mjs';
import {explainWithEngine} from './model.mjs';
/** B's pinned, unmodified offline engine. Default real evaluation clock;
 * original capture/source clocks stay unchanged. No I/O or live adapter.
 */
export const explainMint:ExplainMint=input=>explainWithEngine(input,explainRetainedMint);
