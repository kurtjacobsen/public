// routes-pdf-c23c.v2.mjs
import fs from 'fs';
import path from 'path';
const TMP_DIR = '/tmp';
const PREFIX = 'renolie-';
const SUFFIX = '.pdf';
const PDF_BASE64 = 'JVBERi0xLjQKJcKlwrHDqwoxIDAgb2JqCjw8IC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUiA+PgplbmRvYmoKMiAwIG9iago8PCAvVHlwZSAvUGFnZXMgL0tpZHNbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYWdlc1ttIElOVF0gL0NvbnRlbnRzIDQgMCBSIC9SZXNvdXJjZXMgPDwvRm9udCA8PCAvRjEgNCAwIFIgPj4+ID4+ID4+CmVuZG9iago0IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvTmFtZSAvSGVsdmV0aWNhMSAvQmFzZUZvbnQgL0hlbHZldGljYSA+PgplbmRvYmoKNiAwIG9iago8PCAvVHlwZSAvUGFnZXMgL0NvdW50IDEgL0tpZHNbMyAwIFJdID4+CmVuZG9iago3IDAgb2JqCjw8IC9MZW5ndGggMzUgPj4Kc3RyZWFtCi9HIDkgMCBUZAovRiA0IDE2IFRmCi9UIDE4IFRmCjEwMCA3MDAgVEQKW1JFTk9MSUUgUERGIEZJTEUgdjIuMyBDMjNjXQplbmRzdHJlYW0KZW5kb2JqCjggMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9Db3VudCAxIC9LaWRzWzMgMCBSXSA+PgplbmRvYmoKeHJlZgowIDkKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDEwIDAwMDAwIG4gCjAwMDAwMDAwMDAgMDAwMDAgbiAKMDAwMDAwMDEwMSAwMDAwMCBuIAowMDAwMDAwMDE2IDAwMDAwIG4gCjAwMDAwMDAwMTIgMDAwMDAgbiAKMDAwMDAwMDAyOCAwMDAwMCBuIAp0cmFpbGVyCjw8L1NpemUgOD4+CnN0YXJ0eHJlZg02ODAKJSVFT0Y=';

function b64ToBytes(b64) { return new Uint8Array(Buffer.from(b64, 'base64')); }
function safeSelfUrl(req) {
  const envBase = (process.env.SELF_URL || '').trim();
  if (envBase) return envBase.replace(/\/+$/,'');
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}
export function mountPdfRoutes(app) {
  app.get('/pdf/healthz', (_req, res) => res.json({ ok: true, router: 'pdf-c23c', tmp: TMP_DIR }));
  app.get('/pdf/echo', (req, res) => res.json({ ok: true, demo: String(req.query.demo || '') }));
  app.get('/pdf/tmp/:name', (req, res) => {
    try {
      const name = String(req.params.name || '');
      if (!name.startsWith(PREFIX) || !name.endsWith(SUFFIX)) return res.status(400).json({ ok:false, error:'bad name' });
      const full = path.join(TMP_DIR, name);
      if (!fs.existsSync(full)) return res.status(404).json({ ok:false, error:'not found' });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${name}"`);
      fs.createReadStream(full).pipe(res);
    } catch (e) { res.status(500).json({ ok:false, error: String(e && e.message || e) }); }
  });
  app.post('/pdf/make', async (req, res) => {
    try {
      const body = req.body || {};
      const mode = body.rm_b64 ? 'rm_b64' : (body.recipe_markdown ? 'markdown' : 'none');
      const bytes = b64ToBytes(PDF_BASE64);
      const name = `renolie-${Date.now()}.pdf`;
      const full = path.join(TMP_DIR, name);
      await fs.promises.writeFile(full, Buffer.from(bytes));
      const pdfUrl = `${safeSelfUrl(req)}/pdf/tmp/${name}`;
      res.json({ ok: true, mode, pdfUrl, file: name });
    } catch (e) { res.status(500).json({ ok:false, error: String(e && e.message || e) }); }
  });
}
