// p104.example.mjs
// Example implementation for T2.4.
// Rename to p104.js when ready and ensure it exports: async function generatePdfBytes(payload)
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function generatePdfBytes(payload) {
  const body = payload || {};
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText('RENOLIE — p104.js engine', { x: 50, y: height - 80, size: 14, font, color: rgb(0,0,0) });
  page.drawText('This is a stub. Replace with real renderer.', { x: 50, y: height - 105, size: 11, font, color: rgb(0,0,0) });
  const bytes = await doc.save();
  return bytes;
}
