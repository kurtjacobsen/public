// p104.v1.1.mjs
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
const A4=[595.28,841.89]; const ML=50, MR=50, MT=70, MB=50, LH=14;
function wrap(text,font,size,maxW){ const words=String(text).split(/\s+/); const out=[]; let cur=''; for(const w of words){ const t=cur?(cur+' '+w):w; const wpx=font.widthOfTextAtSize(t,size); if(wpx<=maxW) cur=t; else { if(cur) out.push(cur); cur=w; } } if(cur) out.push(cur); return out; }
function split(md){ const out=[]; const lines=String(md||'').replace(/\r\n/g,'\n').split('\n'); for(let raw of lines){ let t=raw.trimRight(); if(!t.length){ out.push({type:'blank'}); continue; } if(/^###\s+/.test(t)) out.push({type:'h3',text:t.replace(/^###\s+/,'')}); else if(/^##\s+/.test(t)) out.push({type:'h2',text:t.replace(/^##\s+/,'')}); else if(/^#\s+/.test(t)) out.push({type:'h1',text:t.replace(/^#\s+/,'')}); else if(/^\-\s+/.test(t)) out.push({type:'li',text:t.replace(/^\-\s+/, '')}); else out.push({type:'p',text:t}); } return out; }
function ts(){ return new Date().toISOString().replace('T',' ').replace('Z',' UTC'); }
export async function generatePdfBytes(payload){
  const md = (payload && payload.recipe_markdown) ? String(payload.recipe_markdown) : '';
  const doc = await PDFDocument.create();
  doc.setTitle('RENOLIE PDF');
  const page=doc.addPage(A4); const {width,height}=page.getSize();
  const f=await doc.embedFont(StandardFonts.Helvetica); const fb=await doc.embedFont(StandardFonts.HelveticaBold);
  let y=height-MT; page.drawText('RENOLIE — PDF', {x:ML,y, size:16, font:fb, color:rgb(0,0,0)}); y-=18;
  page.drawText(ts(), {x:ML,y, size:10, font:f, color:rgb(0,0,0)}); y-=16;
  const blocks=split(md);
  const para=(text,size=11,bold=false)=>{ const ff=bold?fb:f; const maxW=width-ML-MR; for(const ln of wrap(text,ff,size,maxW)){ if(y<MB+24) break; page.drawText(ln,{x:ML,y,size,font:ff,color:rgb(0,0,0)}); y-=LH; } };
  for(const b of blocks){ if(b.type==='blank'){ y-=LH*0.6; continue; } if(b.type==='h1'){ para(b.text,14,true); y-=4; continue; } if(b.type==='h2'){ para(b.text,13,true); y-=2; continue; } if(b.type==='h3'){ para(b.text,12,true); continue; } if(b.type==='li'){ para('• '+b.text,11,false); continue; } if(b.type==='p'){ para(b.text,11,false); continue; } }
  page.drawLine({ start:{x:ML,y:MB+12}, end:{x:width-MR,y:MB+12}, thickness:0.5, color:rgb(0,0,0)});
  const s='RENOLIE'; page.drawText(s,{x:ML,y:MB,size:9,font:f,color:rgb(0,0,0)});
  const t=ts(); const tw=f.widthOfTextAtSize(t,9); page.drawText(t,{x:width-MR-tw,y:MB,size:9,font:f,color:rgb(0,0,0)});
  return await doc.save();
}
