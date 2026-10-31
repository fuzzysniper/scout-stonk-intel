// Never imported by product code. Explicit SYNTHETIC fixture explanation + one unsupported gray.
import {project,finding} from './fixtures.mjs';
const rows=await project();process.stdout.write(JSON.stringify([finding(rows,'mint-authority'),finding(rows,'lp-custody')],null,2)+'\n');
