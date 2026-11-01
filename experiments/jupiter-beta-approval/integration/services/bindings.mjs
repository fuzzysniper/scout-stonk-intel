// The only secret-read boundary. Never called by the shipped disabled entrypoint.
export function loadBindings(role,env){
 const secret=name=>{const x=env[name];if(typeof x!=='string'||!x)throw Error('beta_binding_missing');return x;};
 const key=name=>{const s=secret(name),b=Buffer.from(s,'base64url');if(b.length!==32||b.toString('base64url')!==s)throw Error('beta_binding_invalid');return b;};
 const out={anchorKey:key('UNFARMD_BETA_ANCHOR_KEY')};
 if(role==='owner')return out;
 out.dsns={};out.neonCA=secret('UNFARMD_BETA_NEON_CA');
 if(role==='validator'||role==='control'){out.dsns.validator=secret('UNFARMD_BETA_VALIDATOR_DSN');out.validatorCredential={publicKey:env.UNFARMD_BETA_VALIDATOR_PUBLIC_KEY,privateKey:secret('UNFARMD_BETA_VALIDATOR_PRIVATE_KEY')};}
 if(role==='authority'||role==='control'){out.dsns.consumer=secret('UNFARMD_BETA_CONSUMER_DSN');out.dsns.stopper=secret('UNFARMD_BETA_STOPPER_DSN');out.consumerKey=key('UNFARMD_BETA_CONSUMER_KEY');}
 return out;
}
