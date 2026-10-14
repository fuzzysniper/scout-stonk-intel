// Explicit synthetic offline registry fixtures, never application evidence.
import { AT, address } from './pairs-fixtures.mjs';
export { AT, address };
export const PROGRAM='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const rows=[
 {mint:address(1),symbol:'STONK',name:'Synthetic one',decimals:9,tokenProgram:PROGRAM},
 {mint:address(2),symbol:'stonk',name:'Synthetic two',decimals:9,tokenProgram:PROGRAM},
 {mint:address(3),symbol:'熊猫',name:'モモ太',decimals:8,tokenProgram:PROGRAM},
 {mint:address(4),symbol:'BOIÚNA',name:'Boiúna',decimals:8,tokenProgram:PROGRAM},
 {mint:address(5),symbol:'XYZ',name:'Synthetic one',decimals:6,tokenProgram:PROGRAM},
];
export function registry(records=rows,now=AT) {
 const counts=new Map();for(const row of records)counts.set(row.symbol.toLowerCase(),(counts.get(row.symbol.toLowerCase())??0)+1);
 return {data:{selectBy:'mint',ambiguousSymbolCount:[...counts.values()].filter(n=>n>1).length,
  pairs:records.map(row=>({...row,symbolAmbiguous:counts.get(row.symbol.toLowerCase())>1}))},meta:{generatedAt:new Date(now).toISOString()}};
}
