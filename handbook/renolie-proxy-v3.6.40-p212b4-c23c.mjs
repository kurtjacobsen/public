// renolie-proxy-v3.6.40-p212b4-c23c.mjs
// ASCII-only. Start: node renolie-proxy.mjs

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { mountChatRoutes } from './routes-chat-p212b4.mjs';
import { mountPdfRoutes } from './routes-pdf-c23c.mjs';

const app = express();

app.use((req, res, next) => {
  const origins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
  return cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origins.length === 0 || origins.includes(origin)) return cb(null, true);
      return cb(null, false);
    }
  })(req, res, next);
});

app.use((req, res, next) => {
  if (req.path === '/chat/stream') return next();
  return compression()(req, res, next);
});

app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'tiny'));

app.get('/healthz', (req, res) => {
  res.json({ ok: true, name: 'renolie-proxy', version: 'v3.6.40-p212b4-c23c', enc: '&aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;', sse: 'no-compress', mode: 'direct' });
});

mountChatRoutes(app);
mountPdfRoutes(app);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('[renolie] listening on :' + PORT));
