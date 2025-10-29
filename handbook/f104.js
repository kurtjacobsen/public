// f104.js — ui.format (v1.0.4, CommonJS)
// Contract (max 10 lines)
// Input: delta:string (raw tekst fra stream/send)
// Output: html:string (ASCII-sikker; b/i/link/lister; ingen scripts)
// Errors: BAD_DELTA (hvis input ikke er streng)
// Notes: Maskerer eksisterende <a>...</a> foer auto-link for at undgaa dobbelt-linkning.

function isAscii(str){ return /^[\x00-\x7F]*$/.test(String(str || '')); }
function normalizePunct(input){
  let s = String(input == null ? '' : input);
  s = s.replace(/[\u2018\u2019\u2032]/g, "'").replace(/[\u201C\u201D\u2033]/g, '"');
  s = s.replace(/[\u2013\u2014]/g, '-').replace(/\u2026/g, '...').replace(/\u00A0/g, ' ');
  return s;
}
function danishToEntities(s){
  return String(s || '').replace(/[\u00E6\u00C6\u00F8\u00D8\u00E5\u00C5]/g, ch => ({
    '\u00E6':'&aelig;','\u00C6':'&AElig;','\u00F8':'&oslash;','\u00D8':'&Oslash;','\u00E5':'&aring;','\u00C5':'&Aring;'
  })[ch] || ch);
}
function escapeHtml(s){
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}
function fmtBoldItalic(s){
  let out = s;
  out = out.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<b>$1</b>');
  out = out.replace(/\*(?=\S)(.+?)(?<=\S)\*/g, '<i>$1</i>');
  return out;
}

function formatDelta(delta){
  if (typeof delta !== 'string') { const e = new Error('BAD_DELTA'); e.code='BAD_DELTA'; throw e; }
  // 1) normaliser + escape
  let s = normalizePunct(delta);
  s = escapeHtml(s);

  // 2) link-markdown [txt](url)
  s = s.replace(/\[(.+?)\]\(((https?:\/\/)[^)\s]+)\)/g, (m,txt,url) => '<a href="' + url + '" target="_blank" rel="noopener">' + txt + '</a>');

  // 3) paragraph + segmented list parsing first (to build <a> within lis safely)
  const paras = s.split(/\r?\n\r?\n/);
  const rendered = paras.map(block => {
    const lines = block.split(/\r?\n/);
    const outSegs = [];
    let listRun = null;
    function flushList(){ if (listRun && listRun.length){ outSegs.push('<ul>' + listRun.join('') + '</ul>'); listRun = null; } }
    for (let raw of lines){
      if (!raw.length) continue;
      const liMatch = raw.match(/^\s*[-*]\s+(.*)$/);
      if (liMatch){
        if (!listRun) listRun = [];
        const li = fmtBoldItalic(liMatch[1].trim());
        listRun.push('<li>' + li + '</li>');
      } else {
        flushList();
        outSegs.push(fmtBoldItalic(raw));
      }
    }
    flushList();
    return outSegs.join('<br>');
  }).join('<br><br>');

  // 4) mask existing anchors, then auto-link bare URLs
  let masked = rendered;
  const anchors = [];
  masked = masked.replace(/<a\b[^>]*>.*?<\/a>/g, m => {
    anchors.push(m);
    return '%%A' + (anchors.length-1) + '%%';
  });
  masked = masked.replace(/\b(https?:\/\/[^\s<]+)\b/g, (m,url) => '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>');
  masked = masked.replace(/%%A(\d+)%%/g, (m,idx) => anchors[Number(idx)]);

  // 5) dansk -> entities
  let out = danishToEntities(masked);

  // 6) ASCII guard
  if (!isAscii(out)) out = out.replace(/[^\x00-\x7F]/g, '?');
  return out;
}

module.exports = { formatDelta, escapeHtml, normalizePunct, danishToEntities, isAscii };
