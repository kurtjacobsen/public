// routes-pdf-c23c.v4d.mjs
// Health shows ttlMin, tmp path, impl, and font presence in ./fonts.
// POST /pdf/make returns cleanup metrics and pdfUrl; uses p104.js when PDF_IMPL=p104, else pdf-lib fallback.
import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const TMP_DIR = '/tmp';
const PREFIX = 'renolie-';
const SUFFIX = '.pdf';
const TTL_MIN = parseInt(process.env.PDF_TTL_MIN || '60', 10);

const FONT_DIR = new URL('./fonts/', import.meta.url);
function fontExists(name) {
  try {
    const p = path.fileURLToPath(new URL(name, FONT_DIR));
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function nowStr(){ return new Date().toISOString().replace('T',' ').replace('Z',' UTC'); }

function safeSelfUrl(req) {
  const envBase = (process.env.SELF_URL || '').trim();
  if (envBase) return envBase.replace(/\/+$/,'');
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}`;
}

function listTmp() {
  try {
    const files = fs.readdirSync(TMP_DIR).filter(n => n.startsWith(PREFIX) && n.endsWith(SUFFIX));
    const now = Date.now(); const ttlMs = TTL_MIN * 60 * 1000;
    let count = 0, expired = 0; const toDelete = [];
    for (const f of files) {
      count++; const full = path.join(TMP_DIR, f); const st = fs.statSync(full);
      if (now - st.mtimeMs > ttlMs) { expired++; toDelete.push(full); }
    }
    return { count, expired, ttlMin: TTL_MIN, toDelete };
  } catch (e) { return { count:0, expired:0, ttlMin: TTL_MIN, error:String(e && e.message || e), toDelete:[] }; }
}
function doCleanup() {
  const info = listTmp(); let removed = 0;
  for (const f of info.toDelete) { try { fs.unlinkSync(f); removed++; } catch {}
  }
  return { ttlMin: info.ttlMin, count: info.count, expired: info.expired, removed };
}

export function mountPdfRoutes(app) {
  app.get('/pdf/healthz', (_req, res) => {
    const impl = (process.env.PDF_IMPL || 'pdf-lib');
    const info = listTmp();
    const fonts = {
      regular: fontExists('NotoSans-Regular.ttf'),
      bold:    fontExists('NotoSans-Bold.ttf'),
      italic:  fontExists('NotoSans-Italic.ttf'),
      boldItal:fontExists('NotoSans-BoldItalic.ttf')
    };
    res.json({ ok:true, router:'pdf-c23c', impl, ttlMin: info.ttlMin, tmp: TMP_DIR, cleanup: { count: info.count, expired: info.expired }, fonts });
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
    } catch (e) { res.status(500).json({ ok:false, error:String(e && e.message || e) }); }
  });

  app.post('/pdf/make', async (req, res) => {
    try {
      const impl = (process.env.PDF_IMPL || 'pdf-lib');
      const body = req.body || {};
      const mode = body.rm_b64 ? 'rm_b64' : (body.recipe_markdown ? 'markdown' : 'none');

      let pdfBytes;
      if (impl === 'p104') {
        try { const { generatePdfBytes } = await import('./p104.js'); pdfBytes = await generatePdfBytes(body); }
        catch (e) {
          // fallback: simple one-page pdf-lib page
          const pdfDoc = await PDFDocument.create();
          const page = pdfDoc.addPage([595.28, 841.89]);
          const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const b = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
          page.drawText('RENOLIE — p104 missing, fallback pdf-lib', { x:50, y:760, size:14, font:b });
          page.drawText(`TS: ${nowStr()}`, { x:50, y:740, size:10, font });
          const lines = String(body.recipe_markdown||'').split(/\r?\n/).slice(0,40);
          let y=700; for (const L of lines) { page.drawText(L, {x:50,y, size:11, font}); y-=16; if (y<50) break; }
          pdfBytes = await pdfDoc.save();
        }
      } else {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const b = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        page.drawText('RENOLIE — pdf-lib', { x:50, y:760, size:14, font:b });
        page.drawText(`TS: ${nowStr()}`, { x:50, y:740, size:10, font });
        const lines = String(body.recipe_markdown||'').split(/\r?\n/).slice(0,40);
        let y=700; for (const L of lines) { page.drawText(L, {x:50,y, size:11, font}); y-=16; if (y<50) break; }
        pdfBytes = await pdfDoc.save();
      }

      const name = `${PREFIX}${Date.now()}${SUFFIX}`;
      const full = path.join(TMP_DIR, name);
      await fs.promises.writeFile(full, Buffer.from(pdfBytes));
      const cleaned = doCleanup();
      const pdfUrl = `${safeSelfUrl(req)}/pdf/tmp/${name}`;
      res.json({ ok:true, impl, mode, ttlMin: cleaned.ttlMin, cleanup: cleaned, pdfUrl, file:name });
    } catch (e) { res.status(500).json({ ok:false, error:String(e && e.message || e) }); }
  });
}
