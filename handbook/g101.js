// g101.js — rate.guard (ESM), ASCII-safe
// Contract:
//   guard({ key:string, limit:number, windowMs:number, requestId?:string }) ->
//     { ok:true } | { ok:false, reason:'RateLimited'|'Duplicate', retryInMs:number }
const buckets = new Map(); // key -> { hits:number[], reqIds:Set }

function now(){ return Date.now(); }

export function guard({ key, limit=10, windowMs=60000, requestId } = {}){
  const k = String(key||'global');
  const b = buckets.get(k) || { hits: [], reqIds: new Set() };
  // duplicate check
  if (requestId && b.reqIds.has(requestId)){
    return { ok:false, reason:'Duplicate', retryInMs: 0 };
  }
  if (requestId) b.reqIds.add(requestId);
  const t = now();
  // drop old
  b.hits = b.hits.filter(x => t - x < windowMs);
  if (b.hits.length >= limit){
    const retryInMs = windowMs - (t - b.hits[0]);
    buckets.set(k, b);
    return { ok:false, reason:'RateLimited', retryInMs: Math.max(0, retryInMs) };
  }
  b.hits.push(t);
  buckets.set(k, b);
  return { ok:true };
}

export default { guard };
