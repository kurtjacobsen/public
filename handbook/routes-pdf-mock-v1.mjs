// routes-pdf-mock-v1.mjs
// ASCII-only. Minimal PDF mock route: POST /pdf/make returns a tiny 1-page PDF.
export function mountPdfRoutes(app) {
  app.get('/pdf/healthz', (req,res)=>res.json({ ok:true, router:'pdf-mock', version:'v1' }));
  const pdfBase64 = 'JVBERi0xLjQKJcKlwrHDqwoxIDAgb2JqCjw8IC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PgplbmRvYmoKMiAwIG9iago8PCAvVHlwZSAvUGFnZXMgL0tpZHNbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYWdlc1ttIElOVF0gL0NvbnRlbnRzIDQgMCBSIC9SZXNvdXJjZXMgPDwvRm9udCA8PCAvRjEgNCAwIFIgPj4+ID4+ID4+CmVuZG9iago0IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvTmFtZSAvSGVsdmV0aWNhMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKNiAwIG9iago8PCAvVHlwZSAvUGFnZXMgL0NvdW50IDEgL0tpZHNbMyAwIFJdID4+CmVuZG9iago3IDAgb2JqCjw8IC9MZW5ndGggMzUgPj4Kc3RyZWFtCi9HIDkgMCBUZAovRiA0IDE2IFRmCi9UIDE4IFRmCjEwMCA3MDAgVEQKW1JFTk9MSUUgUERGIE1PQ0tdIFNoYXJlIE1vY2sKZW5kc3RyZWFtCmVuZG9iago4IDAgb2JqCjw8IC9UeXBlIC9QYWdlcyAvQ291bnQgMSAvS2lkc1szIDAgUl0gPj4KZW5kb2JqCnhyZWYKMCA5CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDAwIDAwMDAwIG4gCjAwMDAwMDAxMDEgMDAwMDAgbiAKMDAwMDAwMDAxNiAwMDAwMCBuIAowMDAwMDAwMDEyIDAwMDAwIG4gCjAwMDAwMDAwMjggMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDg+PgpzdGFydHhyZWYKNjgwCiUlRU9G';
  app.post('/pdf/make', async (req,res)=>{
    try {
      const body = req.body || {};
      const src = body && (body.url || body.content || body.html || body.rm_b64 || '');
      res.json({ ok:true, pdfUrl: 'data:application/pdf;base64,'+pdfBase64, echo: !!src });
    } catch(e) {
      res.status(500).json({ ok:false, error: String(e && e.message || e) });
    }
  });
}
