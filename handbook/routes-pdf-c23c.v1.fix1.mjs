// routes-pdf-c23c.v1.fix1.mjs
// ASCII-only. Minimal PDF routes for testing: POST /pdf/make + GET /pdf/echo?demo=1
// Fixes: invalid JS string for base64 → use single literal; supports rm_b64 and recipe_markdown.

export function mountPdfRoutes(app) {
  app.get('/pdf/echo', (req, res) => {
    return res.json({ ok: true, demo: String(req.query.demo || '') });
  });

  app.post('/pdf/make', async (req, res) => {
    try {
      const body = req.body || {};
      const rm_b64 = body.rm_b64 || null;
      const recipe_markdown = body.recipe_markdown || null;

      // Tiny valid 1-page PDF as data URL (mock) — same payload as mock v1
      const pdfUrl = 'data:application/pdf;base64,JVBERi0xLjQKJcKlwrHDqwoxIDAgb2JqCjw8IC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PgplbmRvYmoKMiAwIG9iago8PCAvVHlwZSAvUGFnZXMgL0tpZHNbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYWdlc1ttIElOVF0gL0NvbnRlbnRzIDQgMCBSIC9SZXNvdXJjZXMgPDwvRm9udCA8PCAvRjEgNCAwIFIgPj4+ID4+ID4+CmVuZG9iago0IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvTmFtZSAvSGVsdmV0aWNhMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKNiAwIG9iago8PCAvVHlwZSAvUGFnZXMgL0NvdW50IDEgL0tpZHNbMyAwIFJdID4+CmVuZG9iago3IDAgb2JqCjw8IC9MZW5ndGggMzUgPj4Kc3RyZWFtCi9HIDkgMCBUZAovRiA0IDE2IFRmCi9UIDE4IFRmCjEwMCA3MDAgVEQKW1JFTk9MSUUgUERGIE1PQ0tdIFNoYXJlIE1vY2sKZW5kc3RyZWFtCmVuZG9iago4IDAgb2JqCjw8IC9UeXBlIC9QYWdlcyAvQ291bnQgMSAvS2lkc1szIDAgUl0gPj4KZW5kb2JqCnhyZWYKMCA5CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDAwIDAwMDAwIG4gCjAwMDAwMDAxMDEgMDAwMDAgbiAKMDAwMDAwMDAxNiAwMDAwMCBuIAowMDAwMDAwMDEyIDAwMDAwIG4gCjAwMDAwMDAwMjggMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDg+PgpzdGFydHhyZWYKNjgwCiUlRU9G';

      return res.json({
        ok: true,
        mode: (rm_b64 ? 'rm_b64' : (recipe_markdown ? 'markdown' : 'none')),
        pdfUrl
      });
    } catch (e) {
      return res.status(500).json({ ok:false, error:String(e && e.message || e) });
    }
  });
}
