/** No logging of payloads, tokens, cookies or provider content in the browser. */
export function inspectFailureMessage(error:unknown,aborted:boolean):string {
 const v=error&&typeof error==='object'?error as {status?:unknown;name?:unknown;message?:unknown;stage?:unknown;requestId?:unknown}:{};
 const stage=typeof v.stage==='string'&&['source_module','source_execution','oracle_module','oracle_execution'].includes(v.stage)?v.stage:null;
 const requestId=typeof v.requestId==='string'&&/^[A-Za-z0-9:._-]{6,120}$/.test(v.requestId)?v.requestId:null;
 const suffix=requestId?' Request ID: '+requestId+'.':'';
 const status=typeof v.status==='number'&&Number.isSafeInteger(v.status)?v.status:null;
 if(status===401)return 'Owner sign-in required (HTTP 401).';
 if(status===403)return 'Inspect request denied (HTTP 403). Reopen the protected Preview in Safari and confirm your Vercel session.';
 if(status===429)return 'Source request was rate-limited (HTTP 429). No facts substituted; try a deliberate lookup later.';
 if(status===503)return 'Inspect source is unavailable (HTTP 503'+(stage?' / '+stage.toUpperCase():'')+'). No live facts were returned.'+suffix;
 if(status!==null)return 'Inspect request failed (HTTP '+status+'). No facts were substituted.'+suffix;
 if(aborted||v.name==='AbortError'||v.name==='TimeoutError')
  return 'Inspection timed out or was interrupted. No facts were substituted. Retry deliberately.';
 if(v.message==='response_too_large')return 'The source response exceeded the private Preview size limit. No facts displayed.';
 if(v.message==='invalid_inspection'||v.message==='invalid_response')
  return 'Inspect returned an invalid evidence response. No facts displayed; report code INVALID_RESPONSE.';
 return 'Inspect connection failed or your protected Vercel session expired. Open this Preview in Safari and retry deliberately.';
}
