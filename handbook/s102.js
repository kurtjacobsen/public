// s102.js — store.persona (M2 mock, ESM), ASCII-safe
// Contract: save(userId,obj) -> {ok:true}; load(userId)->{ok:true,obj|null}; remove(userId)->{ok:true}
const db = new Map();

export async function save(userId, obj){
  db.set(String(userId), (obj && typeof obj === 'object') ? { ...obj } : {});
  return { ok: true };
}

export async function load(userId){
  const v = db.get(String(userId));
  if (v && typeof v === 'object') return { ok: true, obj: { ...v } };
  return { ok: true, obj: null };
}

export async function remove(userId){
  db.delete(String(userId));
  return { ok: true };
}

export const savePersona = save;
export const set = save;
export const setPersona = save;
export const loadPersona = load;
export const get = load;
export const getPersona = load;
export const read = load;
export const removePersona = remove;
export const del = remove;
export const clear = remove;

const api = { save, savePersona, set, setPersona, load, loadPersona, get, getPersona, read, remove, removePersona, del, clear };
export default api;
