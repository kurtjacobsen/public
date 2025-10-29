// routes-pdf-c23c.mjs
// ASCII-only. Minimal PDF routes for testing: POST /pdf/make + GET /pdf/echo?demo=1

export function mountPdfRoutes(app) {
  app.get('/pdf/echo', (req, res) => {
    return res.json({ ok: true, demo: String(req.query.demo || '') });
  });

  app.post('/pdf/make', async (req, res) => {
    try {
      const body = req.body || {};
      const rm_b64 = body.rm_b64 || null;
      const recipe_markdown = body.recipe_markdown || null;
      // Tiny valid 1-page PDF as data URL (mock)
      const pdfUrl = 'data:application/pdf;base64,JVBERi0xLjQKJcKlwrHDqwoxIDAgb2JqCjw8IC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PgplbmRvYmoKM"
      "iAwIG9iago8PCAvVHlwZSAvUGFnZXMgL0tpZHNbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIg"
      "L01lZGlhQm94IFswIDAgNTk1IDg0Ml0gL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgNSAwIFIgPj4gPj4gL0NvbnRlbnRzIDQgMCBSID4+CmVuZG9iago0IDAg"
      "b2JqCjw8IC9MZW5ndGggNTIgPj4Kc3RyZWFtCkJUCjEwMCA3MDAgVEQKKEV4cHJlc3M6IFJFTk9MSUUgUERGIE1PQ0spIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoK"
      "NSAwIG9iago8PCAvVHlwZSAvRm9udCAvU3VidHlwZSAvVHlwZTEgL05hbWUgL0YxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago2IDAgb2JqCjw8IC9U"
      "eXBlIC9YUmVmIC9XIDcgMCBSIC9Sb290IDEgMCBSIC9JbmZvIDggMCBSID4+CmVuZG9iago3IDAgb2JqCjw8IC9TaXplIDkgL0xlbmVndGggMTEgPj4KZW5kb2Jq"
      "CjggMCBvYmoKPDwgL1RpdGxlIChSZW5vbGllIFBERiBNb2NrKSA+PgplbmRvYmoKeHJlZgowIDkKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDY1IDAwMDAw"
      "IG4gCjAwMDAwMDAxMjAgMDAwMDAgbiAKMDAwMDAwMDE5MyAwMDAwMCBuIAowMDAwMDAwMzAzIDAwMDAwIG4gCjAwMDAwMDAzOTYgMDAwMDAgbiAKMDAwMDAwMDQ3"
      "NiAwMDAwMCBuIAowMDAwMDAwNTk2IDAwMDAwIG4gCjAwMDAwMDA2NzkgMDAwMDAgbiAKdHJhaWxlcgo8PCAvUm9vdCAxIDAgUiAvSW5mbyA4IDAgUiA+PgpzdGFy"
      "dHhyZWYKODEzCiUlRU9G';
      return res.json({ ok: true, mode: (rm_b64? 'rm_b64':'markdown'), pdfUrl });
    } catch (e) {
      return res.status(500).json({ ok:false, error:String(e && e.message || e) });
    }
  });
}
