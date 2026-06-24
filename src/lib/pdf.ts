import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const OFFICIAL = ['وزارة الشؤون الاجتماعية والعمل', 'مديرية الشؤون الاجتماعية والعمل في اللاذقية'];

// NOTE: Arabic shaping in PDF needs an embedded TTF (Amiri/Cairo) via
// doc.addFont(). Register your font in public/fonts and load it here.
export function exportEmployeesPdf(title: string, head: string[], rows: (string | number)[][]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' });
  const w = doc.internal.pageSize.getWidth();
  doc.setFontSize(12);
  OFFICIAL.forEach((line, i) => doc.text(line, w - 40, 34 + i * 16, { align: 'right' }));
  doc.setFontSize(14);
  doc.text(title, w - 40, 78, { align: 'right' });
  doc.setFontSize(9);
  doc.text(new Date().toLocaleDateString('ar'), 40, 78);
  autoTable(doc, {
    head: [head], body: rows, startY: 92,
    styles: { halign: 'right', fontSize: 9 },
    headStyles: { fillColor: [184, 155, 94] },
    margin: { left: 20, right: 20 },
  });
  doc.save(`${title}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
