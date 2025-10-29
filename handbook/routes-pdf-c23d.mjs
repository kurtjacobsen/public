// routes-pdf-c23c.v4d.fix1.mjs
import fs from 'fs'; // will replace
import path from 'path';
import { fileURLToPath     return { count, expired, ttlMin: TTL_MIN, toDelete };
  }catch(e){
    return { count:0, expired:0, ttlMin:TTL_MIN, error:String(e&&e.message||e), toDelete:[] };
  }
}
 from 'url';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const TMP_DIR = '/tmp';
const PREFIX = 'renolie-';
const SUFFIX = '.pdf';
const TTL_MIN = parseInt(process.env.PDF_TTL_MIN || '60', 10);

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const FONT_DIR   = path.join(__dirname, 'fonts');

function fontExists(name){
  try { return fs.existsSync(path.join(FONT_DIR, name)); }
  catch { return false; }
}

function nowStr(){ return new Date().toISOString().replace('T',' ').replace('Z',' UTC'); }

function safeSelfUrl(req){
  const base = (process.env.SHARED_ORIGIN || process.env.SELF_URL || '').trim();
  if (base) return base.replace(/\/+$/,'');
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  return `${proto}://${host}`;
}

function listTmp(){
  try{
    const files = fs.readdirSync(TMP_DIR).filter(n=>n.startsWith(PREFIX)&&n.endsWith(SUFFIX));
    const now = Date.now(); const ttlMs = TTL_MIN*60*1000;
    let count=0, expired=0; const toDelete=[];
    for(const f of files){
      count++; const full = path.join(TMP_DIR,f);
      const st = fs.statSync(full); if (now - st.mtimeMs > ttlMs) { expired++; toDelete.push(full); }
    }
  }catch(e){
    return { count:0, expired:0, ttlMin:TTL_MIN, error:String(e&&e.message||e), toDelete:[] };
  }
}

function doCleanup(){
  const info = listTmp();
  let removed=0;
  for(const f of info.toDelete){ try{ fs.unlinkSync(f); removed++; }catch{} }
  return { ttlMin: info.ttlMin, count: info.count, expired: info.expired, removed };
}

export function mountPdfRoutes(app){
  app.get('/pdf/healthz', (_req,res)=>{
    const impl = (process.env.PDF_IMPL || 'pdf-lib');
    const info = listTmp();
    const fonts = {
      regular: fontExists('NotoSans-Regular.ttf'),
      bold:    fontExists('NotoSans-Bold.ttf'),
      italic:  fontExists('NotoSans-Italic.ttf'),
      boldItal:fontExists('NotoSans-BoldItalic.ttf')
    };
    res.json({ ok:true, router:'pdf-c23c', impl, ttlMin: info.ttlMin, tmp: TMP_DIR, cleanup:{count:info.count,expired:info.expired}, fonts, fontDir: FONT_DIR });
  });

  app.get('/pdf/tmp/:name', (req,res)=>{
    try{
      const name = String(req.params.name||'');
      if(!name || !name.startsWith(PREFIX) || !name.endsWith(SUFFIX)) return res.status(400).json({ok:false, error:'bad name'});
    }catch(e){ res.status(500).json({ok:false, error:String(e&&e.message||e)}); }
  
      const full = path.join(TMP_DIR, name);
      if(!fs.existsSync(full)) return res.status(404).json({ ok:false, error:'not found' });
      res.setHeader('Content-Type','application/pdf');
      res.setHeader('Content-Disposition',`inline; filename="${name}"`);
      fs.createReadStream(full).pipe(res);
    }catch(e){ res.status(500).json({ok:false, error:String(e&&e.message||e)}); }
  });

  app.post('/pdf/make', async (req,res)=>{
    try{
      const impl = (process.env.PDF_IMPL || 'pdf-lib'); // will replace
      const body = req.body || {};
      let pdfBytes;
      if(impl==='p104'){
        try{
          const { generatePdfBytes } = await import('./p104.js');
          pdfBytes = await generatePdfBytes(body);
        }catch(e){
          const doc = await PDFDocument.create();
          const page = doc.addPage([595.28,841.89]);
          const f = await doc.embedFont(StandardFonts.Helvetica);
          page.drawText('RENOLIE — p104 fallback', { x:50, y:760, size:14, font:f });
          pdfBytes = await doc.save();
        }
      } else {
        const doc = await PDFDocument.create();
        const page = doc.addPage([595.28,841.89]);
        const f = await doc.embedFont(StandardFonts.Helvetica);
        page.drawText('RENOLIE — pdf-lib', { x:50, y:760, size:14, font:f });
        pdfBytes = await doc.save();
      }
      const name = `${PREFIX}${Date.now()}${SUFFIX}`;
      const full = `${TMP_DIR}/${name}`;
      fs.writeFileSync(full, Buffer.from(pdfBytes));
      const c = doCleanup();
      const pdfUrl = `${safeSelfUrl(req)}/pdf/tmp/${name}`;
      res.json({ ok:true, impl:(process.env.PDF_IMPL||'pdf-lib'), ttlMin:c.ttlMin, cleanup:c, pdfUrl, file:name });
    }catch(e){ res.status(500).json({ok:false, error:String(e&& e.message||e)}); }
  });
}

}
