// q101.js — pdf.schema (ESM), ASCII-safe
// Contract (Input/Output/Errors):
// Input: validate(recipeDraft:Object)
// Output: { ok:true, data:Object } | { ok:false, errors:Array<string> }
// Errors: VALIDATION (reported in errors array)
export function validate(draft = {}){
  const errors = [];
  const out = {};

  // Required fields (minimal happy path for M3)
  if (!draft || typeof draft !== 'object') errors.push('DRAFT_MISSING');
  if (!draft.title || typeof draft.title !== 'string') errors.push('TITLE_MISSING');
  if (!Array.isArray(draft.ingredients) || draft.ingredients.length === 0) errors.push('INGREDIENTS_MISSING');
  if (!draft.steps || !Array.isArray(draft.steps) || draft.steps.length === 0) errors.push('STEPS_MISSING');

  // Optional but recommended
  if (draft.meta && typeof draft.meta !== 'object') errors.push('META_BAD_TYPE');

  // Normalize minimal schema
  out.title = String(draft.title || '').trim();
  out.ingredients = Array.isArray(draft.ingredients) ? draft.ingredients.filter(Boolean) : [];
  out.steps = Array.isArray(draft.steps) ? draft.steps.filter(Boolean) : [];
  out.meta = (draft.meta && typeof draft.meta === 'object') ? draft.meta : {};

  if (errors.length){
    return { ok:false, errors };
  }
  return { ok:true, data: out };
}
export default { validate };
