// renolie-proxy-v3.6.42-p212b2-t21fix.mjs
// Start: node renolie-proxy.mjs
// Build: npm install --omit=dev
// ASCII-only; Danish entities for enc-check: &aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { mountChatRoutes } from './routes-chat-p212b2.mjs'; // eksisterer i dit repo

const app = express();

// ---- CORS (allowlist via env) ---------------------------------------------
const allowList = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowList.length === 0 || allowList.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));

// ---- Compression (skip for SSE) -------------------------------------------
app.use((req, res, next) => (req.path === '/chat/stream' ? next() : compression()(req, res, next)));

// ---- Basics ----------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'tiny'));

// ---- Health ----------------------------------------------------------------
app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    name: 'renolie-proxy',
    version: 'v3.6.42-p212b2-t21fix',
    ts: new Date().toISOString().replace('T',' ').replace('Z',' UTC'),
    enc: '&aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;',
    pdf_engine: process.env.PDF_ENGINE || 'mock'
  });
});

// ---- Mount chat routes -----------------------------------------------------
mountChatRoutes(app);

// ---- Mount PDF routes (T2.1 mock by default; switchable via env) ----------
(async () => {
  const useC23C = (process.env.PDF_ENGINE || '').toLowerCase() === 'c23c';
  if (useC23C) {
    const { mountPdfRoutes } = await import('./routes-pdf-c23c.v1.fix1.mjs');
    mountPdfRoutes(app);
  } else {
    // default mock
    const { mountPdfRoutes } = await import('./routes-pdf-mock-v1.fix1.mjs');
    mountPdfRoutes(app);
  }
})();

// ---- Start -----------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('[renolie-proxy] running on :' + PORT));
