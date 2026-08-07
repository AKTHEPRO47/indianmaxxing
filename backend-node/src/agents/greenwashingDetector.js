'use strict';

/**
 * GreenwashingDetectorAgent — identifies potential greenwashing from evidence/signals.
 */

const GREENWASH_PATTERNS = [
  { pattern: /carbon neutral.*(?!certified|third.party)/i, weight: 2, flag: 'Unverified carbon neutral claim' },
  { pattern: /net.zero.*(?!2030|2040|2050|plan|committed)/i, weight: 1.5, flag: 'Vague net-zero claim' },
  { pattern: /sustainable.*(?!report|certif|audit)/i, weight: 1, flag: 'Unsubstantiated sustainability claim' },
  { pattern: /green(?:wash|er|est)/i, weight: 3, flag: 'Direct greenwashing reference' },
  { pattern: /eco.friendly without evidence/i, weight: 2, flag: 'Eco claim without evidence' },
];

const POSITIVE_OFFSETS = [
  /third.party|independent.*audit|verified|certif/i,
  /science.based.*target|sbti/i,
  /cdp.*score|msci.*rating/i,
];

function detect(evidences = [], signals = []) {
  let riskScore = 0;
  const flags = [];

  for (const ev of evidences) {
    const text = ev.evidenceText || '';
    for (const { pattern, weight, flag } of GREENWASH_PATTERNS) {
      if (pattern.test(text)) {
        riskScore += weight;
        if (!flags.includes(flag)) flags.push(flag);
      }
    }
    // Reduce risk for verified claims
    for (const positivePattern of POSITIVE_OFFSETS) {
      if (positivePattern.test(text)) riskScore = Math.max(0, riskScore - 1);
    }
  }

  // Controversy signals referencing greenwashing
  const greenwashSignals = signals.filter(s =>
    s.title?.toLowerCase().includes('greenwash') || s.category === 'controversy'
  );
  riskScore += greenwashSignals.length * 2;

  const normalizedRisk = Math.min(100, riskScore * 5);
  const riskLevel = normalizedRisk >= 60 ? 'High' : normalizedRisk >= 30 ? 'Medium' : 'Low';

  return {
    greenwashingRisk: Math.round(normalizedRisk * 10) / 10,
    riskLevel,
    flags,
    explanation: `Greenwashing risk: ${riskLevel} (${Math.round(normalizedRisk)}/100). ${flags.length} pattern(s) detected.`,
  };
}

module.exports = { detect };
