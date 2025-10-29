// c105.js — cache.allowlist (ESM, live-ready via n101), ASCII-safe
// Contract:
//   load({ force?, source?:'mock'|'live', url? }):
//     { ok:true, items:Array, stats:{brand:string,count:number,source:string} }
// Behavior:
//   - If source==='mock' OR no usable URL, returns empty items (M2/M3 compatible)
//   - If live, fetches JSON via n101.requestJSON and extracts an item array from common shapes
import { requestJSON } from './n101.js';

function extractArray(obj){
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  const keys = ['items','list','data','arr','allowlist','records','products','obj','payload','result'];
  for (const k of keys){
    const v = obj[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object' && Array.isArray(v.items)) return v.items;
  }
  // deep scan (1 level)
  for (const k of Object.keys(obj)){
    const v = obj[k];
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object' && Array.isArray(v.items)) return v.items;
  }
  return [];
}

export async function load(opts = {}){
  const source = opts.source || (typeof process !== 'undefined' && process.env && process.env.ALLOWLIST_FEED_URL ? 'live' : 'mock');
  const url = opts.url || (typeof process !== 'undefined' && process.env && process.env.ALLOWLIST_FEED_URL);
  if (source === 'live' && url){
    const r = await requestJSON({ url, timeoutMs: 7000 });
    if (r.ok){
      const items = extractArray(r.data);
      const stats = { brand: 'live', count: items.length, source: 'live' };
      return { ok:true, items, stats };
    }else{
      // fall back to empty but ok=true to keep UI responsive; include error in stats
      const items = [];
      const stats = { brand: 'live', count: 0, source: 'live', error: r.error };
      return { ok:true, items, stats };
    }
  }
  // mock
  return { ok:true, items: [], stats: { brand:'mock', count:0, source:'mock' } };
}

export const loadAllowlist = load;
export const build = load;
export const refresh = load;
export const parse = load;

const api = { load, loadAllowlist, build, refresh, parse };
export default api;
