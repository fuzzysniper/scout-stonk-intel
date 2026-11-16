// Paste this function into the authenticated UNIQUE Preview /lens console only.
// Then call verifyNativePreview(binding) with the public binding.json, never any token.
// Exactly three same-origin GETs. No cookie values, login, POST, setup or source action.
globalThis.verifyNativePreview = async function verifyNativePreview(binding) {
  if (binding?.version !== 'native-preview-binding/1' || binding.sourceGo !== false ||
      binding.setupAdmission !== false || binding.identity?.origin !== location.origin ||
      binding.identity?.project !== 'prj_OaA9snVrMUkpXuz6cMSKfSZ6fx5Q' ||
      !/^https:\/\/scout-stonk-intel-[a-z0-9-]+-riskledgerapp\.vercel\.app$/.test(location.origin) ||
      location.pathname !== '/lens') throw Error('NATIVE_PREVIEW_HOLD');
  const results = [];
  for (const route of ['/lens', '/api/native-pilot', '/api/native-pilot/owner/status']) {
    const response = await fetch(route, {method:'GET', credentials:'same-origin',
      redirect:'error', cache:'no-store', signal:AbortSignal.timeout(4000),
      headers:route.endsWith('/status')?{'x-unfarmd-owner-intent':'status'}:{}});
    const text = await response.text();
    if (text.length > 262144) throw Error('NATIVE_PREVIEW_HOLD');
    const ok = route === '/lens' ? response.status === 200 &&
      response.headers.get('content-type')?.includes('text/html') :
      response.status === 503 && JSON.parse(text).error ===
        (route.endsWith('/status')?'native_owner_unavailable':'native_pilot_off');
    if (!ok) throw Error('NATIVE_PREVIEW_HOLD: no identity override, retry or activation');
    results.push({route,status:response.status});
  }
  return {deployment:binding.identity,results,sourceGo:false,setupAdmission:false,
    meaning:'Authenticated source-OFF routes and early native runtime identity only; not owner enrollment, Neon, checkpoint or source proof'};
};
