// routes-pdf-c23c.v3.mjs
import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const TMP_DIR = '/tmp';
const PREFIX = 'renolie-';
const SUFFIX = '.pdf';

function safeSelfUrl(req) {
  const envBase = (process.env.SELF_URL || '').trim();
  if (envBase) return envBase.replace(/\/+$/,'');
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

export function mountPdfRoutes(app) {
  app.get('/pdf/healthz', (_req, res) => res.json({ ok: true, router: 'pdf-c23c', tmp: TMP_DIR, engine: 'pdf-lib' }));
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
      const now = new Date();
      const pdfDoc = await PDFDocument.create();
      pdfDoc.setTitle('RENOLIE PDF');
      const page = pdfDoc.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      page.drawText('RENOLIE — PDF generator', { x: 50, y: height - 80, size: 18, font: fontBold, color: rgb(0,0,0) });
      page.drawText(`Time: ${now.toISOString().replace('T',' ').replace('Z',' UTC')}`, { x: 50, y: height - 110, size: 10, font, color: rgb(0,0,0) });
      page.drawText(`Mode: ${mode}`, { x: 50, y: height - 130, size: 12, font: fontBold, color: rgb(0,0,0) });
      if (body.recipe_markdown) {
        const lines = String(body.recipe_markdown).split(/\r?\n/).slice(0, 40);
        let y = height - 170;
        for (const line of lines) { page.drawText(line, { x: 50, y, size: 11, font, color: rgb(0,0,0) }); y -= 16; if (y < 50) break; }
      } else {
        page.drawText('Placeholder page (pdf-lib).', { x: 50, y: height - 170, size: 11, font, color: rgb(0,0,0) });
      }
      const pdfBytes = await pdfDoc.save();
      const name = `${PREFIX}${Date.now()}${SUFFIX}`;
      const full = path.join(TMP_DIR, name);
      await fs.promises.writeFile(full, Buffer.from(pdfBytes));
      const pdfUrl = `${safeSelfUrl(req)}/pdf/tmp/${name}`;
      res.json({ ok: true, mode, pdfUrl, file: name });
    } catch (e) { res.status(500).json({ ok:false, error: String(e && e.message || e) }); }
  });
}
