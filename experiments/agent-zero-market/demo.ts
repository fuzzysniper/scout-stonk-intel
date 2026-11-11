import { demoInput } from './fixtures';
import { evaluateStudy } from './engine';
if (process.argv.length !== 2) throw Error('Offline built-in synthetic demo takes no inputs, addresses, paths or credentials.');
const d = demoInput();
process.stdout.write(JSON.stringify(evaluateStudy(d.plan, d.captures, d.asOf), null, 2) + '\n');
