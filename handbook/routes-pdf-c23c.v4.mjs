// routes-pdf-c23c.v4.mjs
// T2.4: Optional p104.js engine binding with graceful fallback to pdf-lib.
// ENV controls:
//   PDF_ENGINE=c23c        (already set)
//   PDF_IMPL=p104          -> use ./p104.js (must export async function generatePdfBytes(payload))
//   otherwise              -> fallback to pdf-lib renderer
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

async function renderWithPdfLib(payload) {
  const body = payload || {};
  const mode = body.rm_b64 ? 'rm_b64' : (body.recipe_markdown ? 'markdown' : 'none');
  const now = new Date();
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  page.drawText('RENOLIE — PDF engine (pdf-lib fallback)', { x: 50, y: height - 80, size: 14, font: bold, color: rgb(0,0,0) });
  page.drawText(`Mode: ${mode}`, { x: 50, y: height - 105, size: 11, font, color: rgb(0,0,0) });
  if (body.recipe_markdown) {
    let y = height - 135;
    for (const line of String(body.recipe_markdown).split(/\r?\n/).slice(0, 50)) {
      page.drawText(line, { x: 50, y, size: 10, font, color: rgb(0,0,0) });
      y -= 15; if (y < 50) break;
    }
  }
  return await doc.save();
}

export function mountPdfRoutes(app) {
  app.get('/pdf/healthz', async (_req, res) => {
    const impl = (process.env.PDF_IMPL || 'pdf-lib').toLowerCase();
    return res.json({ ok: true, router: 'pdf-c23c', engine: 'c23c', impl, tmp: TMP_DIR });
  });

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
      const impl = (process.env.PDF_IMPL || 'pdf-lib').toLowerCase();
      const body = req.body || {};

      let pdfBytes;
      if (impl === 'p104') {
        try {
          const mod = await import('./p104.js');
          if (!mod || typeof mod.generatePdfBytes !== 'function') throw new Error('p104.js missing generatePdfBytes(payload)');
          pdfBytes = await mod.generatePdfBytes(body);
        } catch (e) {
          // Graceful fallback
          console.error('[p104] failed, using pdf-lib fallback:', e);
          pdfBytes = await renderWithPdfLib(body);
        }
      } else {
        pdfBytes = await renderWithPdfLib(body);
      }

      const name = `${PREFIX}${Date.now()}${SUFFIX}`;
      const full = path.join(TMP_DIR, name);
      await fs.promises.writeFile(full, Buffer.from(pdfBytes));
      const pdfUrl = `${safeSelfUrl(req)}/pdf/tmp/${name}`;
      res.json({ ok: true, impl: (process.env.PDF_IMPL || 'pdf-lib'), pdfUrl, file: name });
    } catch (e) {
      res.status(500).json({ ok:false, error: String(e && e.message || e) });
    }
  });
}
