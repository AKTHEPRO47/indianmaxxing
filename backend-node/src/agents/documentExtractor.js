'use strict';

const openaiService = require('../services/openai');

/**
 * DocumentExtractorAgent — extracts ESG evidence from text pages.
 */

async function extract(pages, companyName) {
  const results = [];

  for (const page of pages.slice(0, 20)) { // Cap at 20 pages
    if (!page.text?.trim()) continue;
    const extractions = await openaiService.extractFromDocument(page.text, companyName);
    for (const item of extractions) {
      results.push({
        pageNumber: page.pageNumber,
        evidenceText: item.evidenceText || item.evidence_text || page.text.substring(0, 300),
        pillar: item.pillar || 'governance',
        metricName: item.metricName || item.metric_name || 'ESG Disclosure',
        value: item.value != null ? parseFloat(item.value) : null,
        unit: item.unit || null,
        confidenceScore: parseFloat(item.confidenceScore || item.confidence_score || 0.5),
      });
    }
  }

  return results;
}

module.exports = { extract };
