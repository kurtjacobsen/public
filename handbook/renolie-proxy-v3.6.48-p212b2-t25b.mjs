// renolie-proxy-v3.6.48-p212b2-t25b.mjs
// Start: node renolie-proxy.mjs • Build: npm install --omit=dev • ASCII-only
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { mountChatRoutes } from './routes-chat-p212b2.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const allowList = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: (origin, cb) => { if (!origin) return cb(null,true); if (allowList.length===0||allowList.includes(origin)) return cb(null,true); return cb(null,false); }, credentials:true }));
app.use((req,res,next)=> (req.path==='/chat/stream'? next() : compression()(req,res,next)));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'tiny'));

let pdfEngine = (process.env.PDF_ENGINE || 'mock').toLowerCase();
let pdfMounted = false;

app.get('/healthz', (_req,res)=> res.json({
  ok:true, name:'renolie-proxy', version:'v3.6.48-p212b2-t25b',
  pdf_engine: pdfEngine, pdf_mounted: pdfMounted,
  impl: (process.env.PDF_IMPL || 'pdf-lib'),
  enc:'&aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;',
  ts:new Date().toISOString().replace('T',' ').replace('Z',' UTC')
}));

// Mount chat routes first
mountChatRoutes(app);

// Mount PDF routes; no /pdf/healthz fallback here so route's own handler responds
(async()=>{
  try{
    if(pdfEngine==='c23c'){
      const { mountPdfRoutes } = await import('./routes-pdf-c23c.v4c.mjs');
      mountPdfRoutes(app);
      pdfMounted=true;
    } else {
      const { mountPdfRoutes } = await import('./routes-pdf-mock-v1.fix1.mjs');
      mountPdfRoutes(app);
      pdfMounted=true;
    }
  } catch(e){
    console.error('[pdf-mount] error:', e);
    pdfMounted=false;
  }
})();

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('[renolie-proxy] running on :' + PORT));
