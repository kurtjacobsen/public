// p104.v1.2.mjs
// RENOLIE PDF engine v1.2 — NotoSans fonts, multi-page text layout, header/footer with timestamp & page numbers.
import fs from 'fs';
import path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const A4 = [595.28, 841.89];
const MARGIN = { L: 54, R: 54, T: 72, B: 54 };
const LINE_H = 14;
const HEADER_H = 24;
const FOOTER_H = 24;

// Resolve font directory relative to this module file
const __filename = new URL(import.meta.url).pathname;
const __dirname = path.dirname(__filename);
const FONT_DIR = path.join(__dirname, 'fonts');

function loadFontBytes(filename) {
  try {
    const p = path.join(FONT_DIR, filename);
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

function ts() {
  return new Date().toISOString().replace('T',' ').replace('Z',' UTC');
}

function splitMarkdown(md) {
  const out = [];
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  for (let raw of lines) {
    let t = raw.replace(/\s+$/,'');
    if (!t.length) { out.push({ kind:'blank' }); continue; }
    if (/^#{1}\s+/.test(t)) out.push({ kind:'h1', text: t.replace(/^#\s+/, '') });
    else if (/^#{2}\s+/.test(t)) out.push({ kind:'h2', text: t.replace(/^##\s+/, '') });
    else if (/^#{3}\s+/.test(t)) out.push({ kind:'h3', text: t.replace(/^###\s+/, '') });
    else if (/^\-\s+/.test(t)) out.push({ kind:'li', text: t.replace(/^\-\s+/, '') });
    else out.push({ kind:'p', text: t });
  }
  return out;
}

export async function generatePdfBytes(payload = {}) {
  const md = String(payload.recipe_markdown || '');
  const doc = await PDFDocument.create();
  doc.setTitle('RENOLIE PDF');

  // Load fonts or fallback to Helvetica
  const fRegBytes = loadFontBytes('NotoSans-Regular.ttf');
  const fBoldBytes = loadFontBytes('NotoSans-Bold.ttf');
  const fItalBytes = loadFontBytes('NotoSans-Italic.ttf');
  const fBoldItalBytes = loadFontBytes('NotoSans-BoldItalic.ttf');

  const fontReg = fRegBytes ? await doc.embedFont(fRegBytes, { subset: true }) : await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = fBoldBytes ? await doc.embedFont(fBoldBytes, { subset: true }) : await doc.embedFont(StandardFonts.HelveticaBold);
  const fontItal = fItalBytes ? await doc.embedFont(fItalBytes, { subset: true }) : await doc.embedFont(StandardFonts.HelveticaOblique);
  const fontBoldItal = fBoldItalBytes ? await doc.embedFont(fBoldItalBytes, { subset: true }) : await doc.embedFont(StandardFonts.HelveticaBoldOblique);

  const blocks = splitMarkdown(md);

  let page = doc.addPage(A4);
  let { width, height } = page.getSize();
  let pageNum = 1;
  let y = height - MARGIN.T - HEADER_H;

  function newPage() {
    page = doc.addPage(A4);
    ({ width, height } = page.getSize());
    pageNum += 1;
    y = height - MARGIN.T - HEADER_H;
    drawHeaderFooter();
  }

  function drawHeaderFooter() {
    // Header (left: title, right: time)
    const title = 'RENOLIE — PDF';
    page.drawText(title, { x: MARGIN.L, y: height - MARGIN.T + 6, size: 12, font: fontBold, color: rgb(0,0,0) });
    const t = ts();
    const tw = fontReg.widthOfTextAtSize(t, 9);
    page.drawText(t, { x: width - MARGIN.R - tw, y: height - MARGIN.T + 6, size: 9, font: fontReg, color: rgb(0,0,0) });

    // Footer (left: brand, right: "Side X/Y" placeholder; total pages not known yet, so we place "Side X")
    const pageLabel = `Side ${pageNum}`;
    const pw = fontReg.widthOfTextAtSize(pageLabel, 9);
    page.drawLine({ start:{x:MARGIN.L, y:MARGIN.B+FOOTER_H-10}, end:{x:width-MARGIN.R, y:MARGIN.B+FOOTER_H-10}, thickness:0.5, color: rgb(0,0,0) });
    page.drawText('RENOLIE', { x: MARGIN.L, y: MARGIN.B, size: 9, font: fontReg, color: rgb(0,0,0) });
    page.drawText(pageLabel, { x: width - MARGIN.R - pw, y: MARGIN.B, size: 9, font: fontReg, color: rgb(0,0,0) });
  }

  drawHeaderFooter();

  function writeLine(text, { size = 11, font = fontReg } = {}) {
    const maxW = width - (MARGIN.L + MARGIN.R);
    const words = String(text).split(/\s+/);
    let line = '';
    const flush = () => {
      if (y < MARGIN.B + FOOTER_H + LINE_H) { newPage(); }
      page.drawText(line, { x: MARGIN.L, y, size, font, color: rgb(0,0,0) });
      y -= LINE_H;
    };
    for (const w of words) {
      const cand = line ? (line + ' ' + w) : w;
      const wpx = font.widthOfTextAtSize(cand, size);
      if (wpx <= maxW) {
        line = cand;
      } else {
        if (line) { flush(); }
        line = w;
      }
    }
    if (line) { flush(); }
  }

  for (const b of blocks) {
    if (b.kind === 'blank') {
      y -= LINE_H * 0.6;
      if (y < MARGIN.B + FOOTER_H + LINE_H) { newPage(); }
      continue;
    }
    if (b.kind === 'h1') {
      writeLine(b.text, { size: 14, font: fontBold });
      y -= 4;
      continue;
    }
    if (b.kind === 'h2') {
      writeLine(b.text, { size: 13, font: fontBold });
      y -= 2;
      continue;
    }
    if (b.kind === 'h3') {
      writeLine(b.text, { size: 12, font: fontBoldItal });
      continue;
    }
    if (b.kind === 'li') {
      writeLine('• ' + b.text, { size: 11, font: fontReg });
      continue;
    }
    // paragraph
    writeLine(b.text, { size: 11, font: fontReg });
  }

  // NOTE: pdf-lib doesn't support total page count placeholder easily without 2-pass.
  // For simplicity, we only draw "Side X". Can be extended later to include total pages.

  const bytes = await exportPdf(doc);
  return bytes;
}

async function exportPdf(doc) {
  const pdfBytes = await doc.save();
  return pdfBytes;
}
