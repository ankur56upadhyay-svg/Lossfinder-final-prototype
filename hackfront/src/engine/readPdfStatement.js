import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { parsePdfTextPages } from './pdfStatement.js';

export async function readPdfStatement(file) {
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength < 5 || String.fromCharCode(...new Uint8Array(bytes, 0, 4)) !== '%PDF') {
    throw new Error(`${file.name}: this file is not a valid PDF.`);
  }
  const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const task = pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, isEvalSupported: false });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 100) throw new Error(`${file.name}: this PDF has too many pages (maximum 100). Export a shorter statement.`);
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items);
      page.cleanup();
    }
    return parsePdfTextPages(pages);
  } catch (error) {
    if (error.name === 'PasswordException') throw new Error(`${file.name}: password-protected PDFs are not supported yet. Export an unlocked PDF or CSV.`);
    throw error;
  } finally {
    await task.destroy();
  }
}
