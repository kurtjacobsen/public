// renolie-proxy-v3.6.40-smoke.mjs
import express from 'express';
import morgan from 'morgan';
const app = express();
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'tiny'));
app.get('/healthz',(req,res)=>res.json({ok:true,name:'renolie-proxy',version:'v3.6.40-smoke',enc:'&aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;'}));
app.get('/envz',(req,res)=>res.json({ok:true,node:process.version,env:{CORS_ORIGIN:process.env.CORS_ORIGIN||'',PROXY_BASE:process.env.PROXY_BASE||'',SELF_URL:process.env.SELF_URL||'',MODEL_DEFAULT:process.env.MODEL_DEFAULT||''}}));
const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('[smoke] listening on :'+PORT));
