// h101.js — ops.health (ESM), ASCII-safe
// Contract:
//   health({ version:string, encCheck:string, deps?:Array<{name,check:Function}> }) ->
//     { ok:boolean, version, enc:'OK'|'BAD', deps:Object, now:string }
function isAscii(str){
  return /^[\x00-\x7F]*$/.test(String(str||''));
}

export async function health({ version='0.0.0', encCheck='ASCII only', deps=[] } = {}){
  const enc = isAscii(encCheck) ? 'OK' : 'BAD';
  const out = { ok:true, version:String(version), enc, deps:{}, now:new Date().toISOString() };
  for (const d of (Array.isArray(deps)?deps:[])){
    try{
      const ok = await Promise.resolve(d.check());
      out.deps[d.name] = ok ? 'OK' : 'DOWN';
      if (!ok) out.ok = false;
    }catch(_){
      out.deps[d.name] = 'DOWN';
      out.ok = false;
    }
  }
  if (enc === 'BAD') out.ok = false;
  return out;
}

export default { health };
