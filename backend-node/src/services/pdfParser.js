'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Extract text pages from a PDF or plain text file.
 * Uses pdf-parse for PDFs; plain text files are returned as single page.
 */
async function extractPages(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.txt') {
    const content = fs.readFileSync(filePath, 'utf-8');
    return [{ pageNumber: 1, text: content }];
  }

  if (ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);

      // Split into approximate pages by form feed or length
      const rawPages = data.text.split(/\f/).filter(p => p.trim());
      if (rawPages.length > 0) {
        return rawPages.map((text, i) => ({ pageNumber: i + 1, text: text.trim() }));
      }

      // Fallback: entire text as single page
      return [{ pageNumber: 1, text: data.text }];
    } catch (err) {
      console.error('[pdfParser] Failed to parse PDF:', err.message);
      return [{ pageNumber: 1, text: '' }];
    }
  }

  // Unsupported file type — return empty
  return [{ pageNumber: 1, text: '' }];
}

/**
 * Save extracted page text to a file.
 */
async function saveExtractedText(pages, outputPath) {
  const content = pages.map(p => `=== Page ${p.pageNumber} ===\n${p.text}`).join('\n\n');
  fs.writeFileSync(outputPath, content, 'utf-8');
  return outputPath;
}

module.exports = { extractPages, saveExtractedText };
