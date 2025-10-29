// t101.js — telemetry (ESM), ASCII-safe
// Contract:
//   start(ctx?:object) -> { runId, append(event), getAll(), toJSON() }
const store = new Map(); // runId -> events[]

function asciiSafe(str){
  return String(str||'').replace(/[^\x00-\x7F]/g, '?');
}

export function start(ctx = {}){
  const runId = 't-' + Date.now() + '-' + Math.random().toString(36).slice(2,6);
  if (!store.has(runId)) store.set(runId, []);
  const base = { ts: Date.now(), ctx: ctx && typeof ctx==='object' ? ctx : {} };
  function append(event){
    const e = event && typeof event==='object' ? event : { msg: String(event) };
    // ensure ASCII-friendly fields
    if (e.msg) e.msg = asciiSafe(e.msg);
    store.get(runId).push({ ...base, ...e });
    return { ok:true, runId, count: store.get(runId).length };
  }
  function getAll(){ return (store.get(runId) || []).slice(); }
  function toJSON(){ return { ok:true, runId, count: (store.get(runId)||[]).length }; }
  return { runId, append, getAll, toJSON };
}

export default { start };
