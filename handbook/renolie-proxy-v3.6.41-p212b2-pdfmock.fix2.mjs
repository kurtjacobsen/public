// renolie-proxy-v3.6.41-p212b2-pdfmock.fix2.mjs
// ASCII-safe. Start: node renolie-proxy.mjs
// Mounts chat (routes-chat-p212b2.mjs) and a minimal PDF mock (routes-pdf-mock-v1.mjs).
// Fixes: remove bad imports ('new-cors', 'pdf-mock-import'); keep dynamic CORS + mock import.

import express from 'express';
import compression from 'compression';
import morgan from 'morgan';
import { mountChatRoutes } from './routes-chat-p212b2.mjs';

const app = express();

// CORS allowlist from env (comma-separated)
const allowList = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
const _cors = (await import('cors')).default;
app.use((req, res, next) => {
  return _cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (allowList.length === 0 || allowList.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true
  })(req, res, next);
});

// Skip compression for SSE route to avoid buffering
app.use((req, res, next) => {
  if (req.path === '/chat/stream') return next();
  return compression()(req, res, next);
});

app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'tiny'));

// Health + env
app.get('/healthz', (req, res) => {
  res.json({
    ok: true,
    name: 'renolie-proxy',
    version: 'v3.6.41-p212b2-pdfmock-fix2',
    enc: '&aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;',
    ts: new Date().toISOString().replace('T',' ').replace('Z',' UTC')
  });
});
app.get('/envz', (req, res) => {
  res.json({ ok: true, node: process.version, env: {
    CORS_ORIGIN: process.env.CORS_ORIGIN || '',
    PROXY_BASE: process.env.PROXY_BASE || '',
    SELF_URL: process.env.SELF_URL || '',
    MODEL_DEFAULT: process.env.MODEL_DEFAULT || ''
  }});
});

// Mount routers
mountChatRoutes(app);
const { mountPdfRoutes } = await import('./routes-pdf-mock-v1.mjs'); // T2.1 mock
mountPdfRoutes(app);

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('[renolie-proxy] p212b2 + pdf-mock running on :' + PORT));
