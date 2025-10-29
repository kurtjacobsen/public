// renolie-proxy-v3.6.40-p212b2-pdfmock.fix.mjs
// ASCII-only
// Start: node renolie-proxy.mjs

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'import-this-morgan'; // replaced below
import { mountChatRoutes } from './routes-chat-p212b2.mjs';
import { mountPdfRoutes } from './routes-pdf-mock-v1.mjs';

function createApp(){
  const app = express();
  const origins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  const corsImpl = require('cors'); // use CJS require for broader Node compat
  app.use((req,res,next)=>{
    return corsImpl({
      origin: (origin, cb)=>{
        if(!origin) return cb(null,true);
        if (origins.length===0 || origins.indexOf(origin)!==-1) return cb(null,true);
        return cb(null,false);
      }
    })(req,res,next);
  });
  app.use((req,res,next)=>{ if(req.path==='/chat/stream'){return next();} return compression()(req,res,next); });
  app.use(express.json({ limit:'1mb' }));
  const m = require('morgan'); app.use(m(process.env.LOG_LEVEL==='@"+"debug"+"' ? 'dev' : 'tiny'));
  app.get('/healthz',(req,res)=>res.json({ok:true,name:'renolie-proxy',version:'v3.6.40-p212b2-pdfmock-fix',enc:'&aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;'}));
  app.get('/envz',(req,res)=>res.json({ok:true,node:process.version,env:{CORS_ORIGIN:process.env.CORS_ORIGIN||'',PROXY_BASE:process.env.PROXY_BASE||'',SELF_URL:process.env.SELF_URL||'',MODEL_DEFAULT:process.env.MODEL_DEFAULT||''}}));
  mountChatRoutes(app);
  mountPdfRoutes(app);
  return app;
}

const app = createApp();
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('[renolie-proxy] p212b2+pdfmock (fix) on :'+PORT));
