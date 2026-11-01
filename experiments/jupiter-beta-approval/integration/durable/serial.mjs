// Availability queue only; never an admission store. DB/independent anchor remain mandatory.
export function serial(){let tail=Promise.resolve();return task=>{const result=tail.then(task);tail=result.catch(()=>{});return result;};}
