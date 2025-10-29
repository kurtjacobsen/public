// renolie-proxy-v3.6.43-p212b2-t22fix.mjs
// Start: node renolie-proxy.mjs
// Build: npm install --omit=dev
// ASCII-only enc-check: &aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { mountChatRoutes } from './routes-chat-p212b2.mjs';

const app = express();

// ---- CORS ------------------------------------------------------------------
const allowList = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowList.length === 0 || allowList.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
}));

// ---- Compression (skip SSE) ------------------------------------------------
app.use((req, res, next) => (req.path === '/chat/stream' ? next() : compression()(req, res, next)));

// ---- Basics ----------------------------------------------------------------
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.LOG_LEVEL === 'debug' ? 'dev' : 'tiny'));

// ---- Health ----------------------------------------------------------------
let pdfEngine = (process.env.PDF_ENGINE || 'mock').toLowerCase();
let pdfMounted = false;

app.get('/healthz', (_req, res) => {
  res.json({
    ok: true,
    name: 'renolie-proxy',
    version: 'v3.6.43-p212b2-t22fix',
    ts: new Date().toISOString().replace('T',' ').replace('Z',' UTC'),
    enc: '&aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;',
    pdf_engine: pdfEngine,
    pdf_mounted: pdfMounted
  });
});

app.get('/envz', (_req, res) => {
  res.json({
    ok: true,
    node: process.version,
    env: {
      CORS_ORIGIN: process.env.CORS_ORIGIN || '',
      SELF_URL: process.env.SELF_URL || '',
      MODEL_DEFAULT: process.env.MODEL_DEFAULT || '',
      PDF_ENGINE: process.env.PDF_ENGINE || ''
    }
  });
});

// ---- Mount chat routes -----------------------------------------------------
mountChatRoutes(app);

// ---- /pdf/healthz fallback (exists even before router is mounted) ----------
app.get('/pdf/healthz', (_req, res) => {
  res.json({ ok: true, router: (pdfMounted ? `pdf-${pdfEngine}` : 'unmounted') });
});

// ---- Mount PDF routes ------------------------------------------------------
(async () => {
  try {
    if (pdfEngine === 'c23c') {
      const { mountPdfRoutes } = await import('./routes-pdf-c23c.v1.fix1.mjs');
      mountPdfRoutes(app);
      pdfMounted = true;
    } else {
      const { mountPdfRoutes } = await import('./routes-pdf-mock-v1.fix1.mjs');
      mountPdfRoutes(app);
      pdfMounted = true;
    }
  } catch (e) {
    console.error('[pdf-mount] error:', e);
    pdfMounted = false;
  }
})();

// ---- Start -----------------------------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('[renolie-proxy] running on :' + PORT));
