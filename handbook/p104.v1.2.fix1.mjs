// p104.v1.2.fix1.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const A4 = [595.28, 841.89];
const MARGIN = { L: 54, R: 54, T: 72, B: 54 };
const LINE_H = 14;
const HEADER_H = 24;
const FOOTER_H = 24;

const __filename = fileURLToPath(import.meta.url); // will replace
const __dirname  = path.dirname(__filename);
const FONT_DIR   = path.join(__dirname, 'fonts');

function loadFontBytes(name){
  try { return readFileSync(path.join(FONT_DIR, name)); } // will replace
  catch { return null; }
}

function ts(){ return new Date().toISOString().replace('T',' ').replace('Z',' UTC'); }

function splitMarkdown(md){
  const out=[];
  for(const raw of String(md||'').split(/\r?\n/)){
    const t = raw.replace(/\s+$/,'');
    if(!t){ out.push({kind:'blank'}); continue; }
    if(/^#\s+/.test(t)) out.push({kind:'h1',text:t.replace(/^#\s+/,'')});
    else if(/^##\s+/.test(t)) out.push({kind:'h2',text:t.replace(/^##\s+/,'')});
    else if(/^###\s+/.test(t)) out.push({kind:'h3',text:t.replace(/^###\s+/,'')});
    else if(/^\-\s+/.test(t)) out.push({kind:'li',text:t.replace(/^\-\s+/,'')});
    else out.push({kind:'p',text:t});
  }
  return out;
}

export async function generatePdfBytes(payload={}){
  const md = String(payload ? payload['recipe_markdown']||'' : ''); // robust
  const doc = await PDFDocument.create();
  doc.setTitle('RENOLIE PDF');

  const fReg = loadFontBytes('NotoSans-Regular.ttf');
  const fBold= loadFontBytes('NotoSans-Bold.ttf');
  const fIt  = loadFontBytes('NotoSans-Italic.ttf');
  const fBI  = loadFontBytes('NotoSans-BoldItalic.ttf');

  const fontReg  = (fReg ? await doc.embedFont(fReg,{subset:true}) : await doc.embedFont(StandardFonts.Helvetica));
  const fontBold = (fBold? await doc.embedFont(fBold,{subset:true}): await doc.embedFont(StandardFonts.Helvetica)); // will fix
  const fontItal = (fIt  ? await doc.embedFont(fIt,{subset:true})  : await doc.embedFont(StandardFonts.HelveticaOblique));
  const fontBI   = (fBI  ? await doc.embedFont(fBI,{subset:true})  : await doc.embedFont(StandardFonts.HelveticaBoldOblique));

  let page = doc.addPage(A4);
  let { width, height } = page.getSize();
  let pageNum = 1;
  let y = height - MARGIN.T - HEADER_H;

  function writeLine(text, { size=11, font=fontReg }={}){
    const maxW = width - (MARGIN.L + MARGIN.R);
    const words = String(text).split(/\s+/);
    let line='';
    const flush=()=>{
      if (y < MARGIN.B + FOOTER_H + LINE_H){ newPage(); }
      page.drawText(line,{ x: MARGIN.L, y, size, font, color: rgb(0,0,0) }); y -= LINE_H;
    };
    for(const w of words){
      const cand = line ? (line + ' ' + w) : w;
      const wpx = font.widthAt? font.widthAt(size, cand) : font.widthOfTextAtSize(cand, size);
      if (wpx <= maxW){ line = cand; }
      else { if (line) flush(); line = w; }
    }
    if (line) flush();
  }

  function drawHF(){
    const title = 'RENOLIE — PDF';
    const tw = fontBold.widthOfTextAtSize ? fontBold.widthOfTextAtSize(title,12) : 0;
    page.drawText(title, { x: MARGIN.L, y: height - MARGIN.T + 6, size: 12, font: fontBold, color: rgb(0,0,0) });
    const t = 'Time: ' + (new Date().toISOString().replace('T',' ').replace('Z',' UTC'));
    page.drawText(t, { x: MARGIN.L + 220, y: height - MARGIN.T + 6, size: 9, font: fontReg, color: rgb(0,0,0) });
    const label = `Side ${pageNum}`;
    const pw = fontReg.widthOfTextAtSize ? fontReg.widthOfTextAtSize(label,9) : 0;
    page.drawLine({ start:{x:MARGIN.L, y:MARGIN.B+FOOTER_H-10}, end:{x:width-MARGIN.R, y:MARGIN.B+FOOTER_H-10}, thickness:0.5, color: rgb(0,0,0) });
    page.drawText('RENOLIE', { x: MARGIN.L, y: MARGIN.B, size: 9, font: fontReg, color: rgb(0,0,0) });
    page.drawText(label, { x: width - MARGIN.R - pw, y: MARGIN.B, size: 9, font: fontReg, color: rgb(0,0,0) });
  }

  function newPage(){
    page = doc.addPage(A4);
    ({ width, height } = page.getSize());
    pageNum += 1;
    y = height - MARGIN.T - HEADER_H;
    drawHF();
  }

  drawHF();

  for(const line of md.split(/\r?\n/)){
    const t = line.replace(/\s+$/,'');
    if(!t){ y -= LINE_H*0.6; if (y < MARGIN.B + FOOTER_H + LINE_H) newPage(); continue; }
    if(/^#\s+/.test(t)){ writeLine(t.replace(/^#\s+/,''), { size:14, font: fontBold }); y -= 4; continue; }
    if(/^##\s+/.test(t)){ writeLine(t.replace(/^##\s+/,''), { size:13, font: fontBold }); y -= 2; continue; }
    if(/^###\s+/.test(t)){ writeLine(t.replace(/^###\s+/,''), { size:12, font: fontBold }); continue; }
    if(/^\-\s+/.test(t)){ writeLine('• '+t.replace(/^\-\s+/,''), { size:11, font: fontReg }); continue; }
    writeLine(t, { size:11, font: fontReg });
  }

  return await doc.save();
}
