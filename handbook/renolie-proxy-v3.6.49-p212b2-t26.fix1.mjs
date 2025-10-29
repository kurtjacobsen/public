// renolie-proxy-v3.6.49-p212b2-t26.fix1.mjs
// Start: node renolie-proxy.mjs • Build: npm install --omit=dev • ASCII-only
import fs from 'fs';
import path from 'path';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { mountChatRoutes } from './routes-chat-p212b2.mjs';

const app = express();
const allowList=(process.env.CORS_ORIGIN||'').split(',').map(s=>s.trim()).filter(Boolean);
app.use(cors({ origin:(o,cb)=>{ if(!o) return cb(null,true); if(allowList.length===0||allowList.includes(o)) return cb(null,true); return cb(null,false); }, credentials:true }));
app.use((req,res,next)=> (req.path==='/chat/stream'? next() : compression()(req,res,next)));
app.use(express.json({limit:'1mb'}));
app.use(morgan(process.env.LOG_LEVEL==='debug'?'dev':'tiny'));

const TMP_DIR = '/tmp';
const PREFIX='renolie-'; const SUFFIX='.pdf';
const TTL_MIN = parseInt(process.env.PDF_TTL_MIN||'60',10);
const CLEAN_INT_MIN = parseInt(process.env.PROXY_CLEAN_INTERVAL_MIN||'10',10);

let lastClean = null, lastRemoved=0;

function proxyCleanup() {
  try {
    const files = fs.readdirSync(TMP_DIR).filter(n=>n.startsWith(PREFIX)&&n.endsWith(SUFFIX));
    const now=Date.now(); const ttlMs=TTL_MIN*60*1000;
    let removed=0;
    for(const f of files){
      const full = path.join(TMP_DIR,f);
      const st = fs.statSync(full);
      if(now - st.mtimeMs > ttlMs){
        try{ fs.unlinkSync(full); removed++; } catch{}
      }
    }
    lastClean = new Date().toISOString().replace('T',' ').replace('Z',' UTC');
    lastRemoved = removed;
  } catch(e){
    lastClean = 'error:'+String(e&&e.message||e);
  }
}

let cleanTimer = null;
function startCleaner(){
  if (cleanTimer) clearInterval(cleanTimer);
  cleanTimer = setInterval(proxyCleanup, CLEAN_INT_MIN*60*1000);
  setTimeout(proxyCleanup, 5000); // run once shortly after start
}

let pdfEngine=(process.env.PDF_ENGINE||'mock').toLowerCase(); let pdfMounted=false;
app.get('/healthz',(_req,res)=>res.json({
  ok:true,name:'renolie-proxy',version:'v3.6.49-p212b2-t26.fix1',
  pdf_engine:pdfEngine,pdf_mounted:pdfMounted,impl:(process.env.PDF_IMPL||'pdf-lib'),
  ttlMin: TTL_MIN, cleanIntervalMin: CLEAN_INT_MIN, lastClean, lastRemoved,
  enc:'&aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;', ts:new Date().toISOString().replace('T',' ').replace('Z',' UTC')
}));

// No /pdf/healthz fallback — route handles it
mountChatRoutes(app);

(async()=>{ try{
  if(pdfEngine==='c23c'){
    const { mountPdfRoutes } = await import('./routes-pdf-c23c.v4d.mjs');
    mountPdfRoutes(app); pdfMounted=true;
  } else {
    const { mountPdfRoutes } = await import('./routes-pdf-mock-v1.fix1.mjs');
    mountPdfRoutes(app); pdfMounted=true;
  }
  startCleaner();
} catch(e){ console.error('[pdf-mount] error:', e); pdfMounted=false; }})();

const PORT=process.env.PORT||3000; app.listen(PORT,()=>console.log('[renolie-proxy] running on :'+PORT));
