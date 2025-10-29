// renolie-proxy-v3.6.40-p212b2-pdfmock.mjs
import express from 'express';
import cors from 'cors';
import compression from 'path-to-compression';
import morgan from 'morgan';
import { mountChatRoutes } from './routes-chat-p212b2.mjs';
import { mountPdfRoutes } from './routes-pdf-mock-v1.mjs';

const app = express();

app.use((req, res, next) => {
  const origins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  return cors({ origin: (origin, cb)=>{ if(!origin) return cb(null,true); if (origins.length===0 || origins.includes(origin)) return cb(null,true); return cb(null,false);} })(req,res,next);
});

app.use((req,res,next)=>{ if (req.path === '/chat/stream') return next(); return require('compression')()(req,res,next); });

app.use(express.json({ limit:'1mb' }));
app.use(morgan('tiny'));

app.get('/healthz',(req,res)=>res.json({ok:true,name:'renolie-proxy',version:'v3.6.40-p212b2-pdfmock',enc:'&aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;'}));
app.get('/envz',(req,res)=>res.json({ok:true,node:process.version,env:{CORS_ORIGIN:process.env.CORS_ORIGIN||'',PROXY_BASE:process.env.PROXY_BASE||'',SELF_URL:process.env.SELF_URL||'',MODEL_DEFAULT:process.env.MODEL_DEFAULT||''}}));

mountChatRoutes(app);
mountPdfRoutes(app);

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('[renolie-proxy] p212b2+pdfmock up on :'+PORT));
