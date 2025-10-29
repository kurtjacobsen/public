// n101.js — net.client (ESM), ASCII-safe
// Contract:
//   requestJSON({ url, method='GET', headers?, body?, timeoutMs=8000 }) ->
//     { ok:true, data:any } | { ok:false, error:string, status?:number }
export async function requestJSON({ url, method='GET', headers = {}, body, timeoutMs = 8000 } = {}){
  try{
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const init = { method, headers: { 'accept':'application/json', ...headers }, signal: ctrl.signal };
    if (body !== undefined){
      init.body = (typeof body === 'string') ? body : JSON.stringify(body);
      init.headers['content-type'] = init.headers['content-type'] || 'application/json';
    }
    const res = await fetch(url, init);
    clearTimeout(t);
    const status = res.status;
    const txt = await res.text();
    let data = null;
    try{ data = txt ? JSON.parse(txt) : null; }catch(_){ data = { raw: txt }; }
    if (!res.ok){
      return { ok:false, error: 'HTTP_'+status, status, data };
    }
    return { ok:true, data };
  }catch(e){
    const msg = (e && e.name === 'AbortError') ? 'TIMEOUT' : String(e && e.message || e);
    return { ok:false, error: msg };
  }
}
export default { requestJSON };
