// r101.js — rules.core (v1.0.0)
// Contract (max 10 lines)
// Input: rules:string (JSON eller key=value per linje) + str inputs
// Output: helpers { getRule, isAscii, assertAscii, normalizePunct, danishToEntities }
// Errors: RULE_MISSING (obligatorisk regel mangler), BAD_ASCII (assertAscii fejler)
// Notes: ASCII-only; UI-entities haandteres typisk i f101/u101

function parseRules(rules) {
  if (!rules) return {};
  if (typeof rules === 'object') return rules;
  const trimmed = String(rules).trim();
  if (!trimmed) return {};
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try { return JSON.parse(trimmed); } catch (_) {}
  }
  const obj = {};
  for (const line of trimmed.split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
    if (m) obj[m[1].trim()] = m[2];
  }
  return obj;
}

function getRule(rules, key, defVal, { required = false } = {}) {
  const obj = parseRules(rules);
  if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
  if (required) {
    const e = new Error('RULE_MISSING');
    e.code = 'RULE_MISSING';
    e.key = key;
    throw e;
  }
  return defVal;
}

const ASCII_RE = /^[\x00-\x7F]*$/;
function isAscii(str) { return ASCII_RE.test(String(str || '')); }
function assertAscii(str, { label = 'value' } = {}) {
  if (!isAscii(str)) {
    const e = new Error('BAD_ASCII');
    e.code = 'BAD_ASCII';
    e.label = label;
    throw e;
  }
  return true;
}

function normalizePunct(input) {
  let s = String(input == null ? '' : input);
  s = s.replace(/[\u2018\u2019\u2032]/g, "'")
       .replace(/[\u201C\u201D\u2033]/g, '"');
  s = s.replace(/[\u2013\u2014]/g, '-');
  s = s.replace(/\u2026/g, '...');
  s = s.replace(/\u00A0/g, ' ');
  return s;
}

// Map danske bogstaver til HTML-entities via unicode escapes (ASCII-safe source)
function danishToEntities(input) {
  let s = String(input == null ? '' : input);
  const map = {
    '\u00E6': '&aelig;', '\u00C6': '&AElig;',
    '\u00F8': '&oslash;', '\u00D8': '&Oslash;',
    '\u00E5': '&aring;',  '\u00C5': '&Aring;'
  };
  return s.replace(/[\u00E6\u00C6\u00F8\u00D8\u00E5\u00C5]/g, ch => map[ch] || ch);
}

module.exports = {
  parseRules,
  getRule,
  isAscii,
  assertAscii,
  normalizePunct,
  danishToEntities,
};
