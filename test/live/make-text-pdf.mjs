// Writes a small, valid text PDF (real text, extractable by pypdf) for local tests. No dependencies.
// Usage: node test/live/make-text-pdf.mjs <out.pdf> [line ...]
import fs from 'fs';

const [out, ...given] = process.argv.slice(2);
const lines = given.length ? given : [
  'Photosynthesis is the process by which green plants make their own food.',
  'Chlorophyll in the leaves absorbs light energy from the sun.',
  'Carbon dioxide and water are converted into glucose and oxygen.',
  'The light-dependent reactions take place in the thylakoid membranes.',
  'The Calvin cycle uses ATP and NADPH to fix carbon into sugars.',
];
const esc = (s) => s.replace(/[\\()]/g, (c) => `\\${c}`);
const content = ['BT', '/F1 11 Tf', '14 TL', '50 760 Td', ...lines.map((l) => `(${esc(l)}) Tj T*`), 'ET'].join('\n');
const objects = [
  '<< /Type /Catalog /Pages 2 0 R >>',
  '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
  '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
  `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
];
let pdf = '%PDF-1.4\n';
const offsets = [];
objects.forEach((o, i) => {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
});
const xref = Buffer.byteLength(pdf);
pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
fs.writeFileSync(out, pdf);
console.log(`wrote ${out}`);
