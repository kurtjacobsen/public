// u106.js — ui.controller (ESM, default rm_b64 via p104 + live-ready allowlist), ASCII-safe
// Contract: init({ s101, c101?, f104?, q101?, pdf? }) -> controller
// Defaults: c101 -> c105, q101 -> q101, pdf -> p104
import * as q101Default from './q101.js';
import * as c105Default from './c105.js';
import * as p104Default from './p104.js';

export async function init(args = {}){
  const s101 = args.s101;
  const c101 = args.c101 || c105Default;
  const q101 = args.q101 || q101Default;
  const pdf = args.pdf || p104Default;
  const f104 = args.f104 || { toHtml: s => String(s||'') };

  return {
    async boot(){ return true; },
    async setPersona(p){
      try{
        const fn = s101 && (s101.save || s101.set || s101.savePersona || s101.setPersona);
        if (fn) await Promise.resolve(fn('u_demo', p));
      }catch(_){}
      return { ok: true };
    },
    async allowlistGet(){
      try{
        if (c101 && typeof c101.load === 'function'){
          const out = await Promise.resolve(c101.load({ force:false }));
          if (Array.isArray(out)) return out;
          if (out && Array.isArray(out.items)) return out.items;
          if (out && out.data && Array.isArray(out.data.items)) return out.data.items;
        }
      }catch(_){}
      return [];
    },
    async makePdf(draft, opts){
      const v = q101.validate(draft || {});
      if (!v || v.ok !== true) return { ok:false, error:'VALIDATION', details: v && v.errors };
      const r = await pdf.make(v.data, opts || {});
      return r;
    }
  };
}

export default { init };
