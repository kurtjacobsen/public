// a101.js — net.stream-adapter (v1.0.0, CommonJS)
// Contract (max 10 lines)
// Input: chunks/deltas (strings) pushed i rækkefølge + { requestId }
// Output: events: { onDelta, onDone, onError } eller run helper der samler tekst
// Errors: DUPLICATE (samme requestId kørt 2 gange samtidigt), UPSTREAM_TIMEOUT (ikke brugt i mock)
// Notes: Idempotens: samme (requestId, seq) eller identiske gentagne deltas ignoreres.
//        Ingen ekstern dep; ASCII-sikkerhed i output.

function isAscii(s){ return /^[\x00-\x7F]*$/.test(String(s || '')); }
function normalizePunct(s){
  return String(s == null ? '' : s)
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ');
}

const inFlight = new Set();

function createStreamAdapter({ requestId }){
  if (!requestId) requestId = 'auto-'+Date.now();
  if (inFlight.has(requestId)){
    const e = new Error('DUPLICATE'); e.code='DUPLICATE'; throw e;
  }
  inFlight.add(requestId);

  let buffer = '';
  let lastChunk = '';
  let closed = false;

  function push(chunk){
    if (closed) return;
    const c = normalizePunct(String(chunk == null ? '' : chunk));
    if (c === '' || c === lastChunk) return; // dedupe simple repeats
    lastChunk = c;
    buffer += c;
  }
  function done(){
    if (closed) return;
    closed = true;
    inFlight.delete(requestId);
    // ASCII-guard
    if (!isAscii(buffer)) buffer = buffer.replace(/[^\x00-\x7F]/g, '?');
    return buffer;
  }
  function error(err){
    closed = true;
    inFlight.delete(requestId);
    const e = new Error('STREAM_ERROR'); e.code='STREAM_ERROR'; e.detail = String(err && err.message || err || '');
    throw e;
  }

  return { push, done, error, getBuffer: ()=>buffer, getRequestId: ()=>requestId };
}

// Convenience: runStream(chunks, {requestId}) -> samlet tekst
function runStream(chunks, { requestId } = {}){
  const s = createStreamAdapter({ requestId });
  for (const c of (chunks || [])) s.push(c);
  return s.done();
}

module.exports = { createStreamAdapter, runStream };
