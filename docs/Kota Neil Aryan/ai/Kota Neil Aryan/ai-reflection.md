# AI Reflection: Kota, Neil, and Aryan

## Research Context

Our contribution treats ESG research as an evidence-management and signal-updating problem rather than as a static sustainability-rating exercise. The product combines structured ESG metrics, extracted report evidence, news-derived signals, historical score snapshots, and market context so that an investor can inspect both the current state of a company and recent changes to that state.

AI was useful as a research-engineering assistant: it helped define taxonomies, formulate data-flow hypotheses, generate test cases, and identify inconsistencies between provider conventions and application code. It was not used as a source of unverified company facts. The database, source material, deterministic scoring code, tests, provider responses, and deployment logs remained the sources of truth.

## Research Pipeline and Data Provenance

### 1. Evidence acquisition

The system has two complementary evidence paths:

- **Company reports:** authenticated users can upload PDF, TXT, or DOCX sustainability material. Extraction creates report records, evidence records, and ESG metrics linked to the company and, where available, the source report.
- **News flow:** the scheduled ingestion service retrieves a bounded set of Yahoo Finance RSS headlines for companies with a ticker. Each source request has a timeout, each company is isolated so one failed request does not halt the complete refresh, and a process-level `refreshInFlight` guard prevents concurrent refresh runs.

The ingestion layer deduplicates a headline by `(companyId, title, source)` before creating a signal. That is significant from a research perspective: repeated syndication of the same article should not be misinterpreted as multiple independent events. The design therefore stores the headline source and publication date alongside the classified result, allowing a user to inspect where a signal came from and when it entered the system.

### 2. Deterministic first-pass classification

The implemented signal classifier is deliberately deterministic and inspectable. It scans a title and body against category vocabularies for:

- environmental factors, such as emissions, climate, water, waste, pollution, and biodiversity;
- social factors, such as worker safety, diversity, labor, community, and human rights;
- governance factors, such as boards, corruption, audits, regulatory matters, and cybersecurity;
- AI adoption, such as machine learning, automation, digital transformation, AI infrastructure, and AI hiring; and
- controversy, such as fraud, lawsuits, fines, recalls, accidents, protests, and greenwashing.

Positive and negative term sets determine sentiment. Negative or controversy signals can receive a severity score, with terms such as `death`, `explosion`, `disaster`, `fraud`, `billion`, and `criminal` increasing severity up to a capped value of 10. Classification confidence starts at 0.50 and increases with category-keyword coverage, capped at 0.95.

This approach is weaker than a domain-tuned supervised model at handling irony, negation, context, and novel terminology, but it is reproducible. The same text produces the same initial category, sentiment, severity, and confidence. For an educational ESG platform, that transparency is preferable to presenting opaque model output as certainty.

### 3. Persisted research objects

The research model keeps distinct record types instead of collapsing everything into one score:

| Record | Research role |
|---|---|
| `Report` | Records an uploaded source document and its processing status. |
| `Evidence` | Stores attributable text or source metadata with a confidence value. |
| `ESGMetric` | Stores a measured value, unit, pillar, year, report, and optional supporting evidence. |
| `Signal` | Stores an event-level observation with category, sentiment, severity, explanation, source, date, and confidence. |
| `ScoreSnapshot` | Preserves timestamped ESG, momentum, AI-adoption, risk, confidence, classification, and investor-signal outputs. |

This separation supports a traceability chain: a dashboard score can be traced to a snapshot; a snapshot to the metrics, evidence, and signals evaluated at that time; and a signal to its source headline or uploaded document. The company copilot is intended to use that stored context, rather than answer from an unconstrained model memory.

## Scoring Methodology

### ESG pillar calculation

Environmental, social, and governance pillars are calculated independently. The environmental, social, and governance weights are respectively 0.40, 0.30, and 0.30:

$$
ESG = 0.40E + 0.30S + 0.30G
$$

Within each pillar, the scoring service first calculates a metric score and a signal score. Numeric metrics are interpreted conservatively: emissions and CO2 metrics use an inverse transformation, percentage metrics are capped at 100, and unsupported numeric units fall back to a neutral baseline. Each metric contribution is multiplied by its confidence score. If no usable numeric metrics exist, the service uses a bounded fallback based on high-confidence evidence coverage.

The metric and signal scores are blended as:

$$
P = 0.60P_{metric} + 0.40P_{signal}
$$

when metrics exist. If no metrics are available, the score relies on the signal component. This makes recent events visible without allowing a single headline to completely overwrite measured evidence.

### Momentum, AI adoption, controversy, and confidence

The final snapshot also includes outputs from specialized agents:

- **Momentum:** calculated from the available signals and metrics to represent direction and recent change, rather than a separate market-price forecast.
- **AI adoption:** estimated from AI-related signals and evidence, allowing an investor to distinguish automation or digital-transformation activity from ESG quality itself.
- **Controversy risk:** calculated from potentially negative or controversy-related signals and used as a guardrail against superficially positive classification.
- **Confidence:** calculated from average evidence confidence plus a capped evidence-volume bonus. No evidence produces a low baseline confidence of 0.20; more high-confidence evidence raises confidence but cannot exceed 0.95.

The confidence field is important because it measures support coverage, not the moral quality of a company. A high ESG score with low confidence should be read differently from the same score backed by many attributable evidence records.

### Research-oriented classification

The application derives labels from ESG score and momentum. Examples include `Hidden Winner`, `Future Leader`, `Value Trap`, and `Overrated Leader`. A controversy-risk threshold of 75 overrides the ordinary investor signal with `Risk Alert`.

These labels are screening aids, not investment recommendations. They are useful for prioritizing research questions such as: "Why has momentum improved while ESG remains low?" or "Does a strong ESG score coexist with a newly elevated controversy risk?" The correct next step is to inspect evidence, signals, and score history, not to make a decision from a label alone.

## AI Contributions to Research Engineering

### Turning qualitative requirements into inspectable data contracts

AI helped decompose broad requirements such as "identify ESG momentum" into explicit entities, fields, and review steps. The resulting design separates a source document, extracted evidence, metric, event signal, and score snapshot. This reduced ambiguity about whether a dashboard number represents an original source fact, a classifier observation, or a derived calculation.

AI also helped formulate the investigator’s workflow: search for a company, inspect the latest score, compare historical snapshots, read relevant signals and evidence, then use the copilot to synthesize the stored record. We reviewed this workflow against the actual routes and frontend views before documenting it as implemented.

### Testing the relationship between news and scoring

The key automated research loop is:

1. Fetch a bounded set of RSS headlines for a listed company.
2. Deduplicate against persisted signals.
3. Classify only new items.
4. Persist the new signals with provenance fields.
5. Recalculate the company score only when new signals were created.
6. Evaluate active alert rules against the new snapshot.

AI was valuable in identifying failure modes for this loop: duplicate syndication, no ticker, remote-feed timeouts, a failed individual company request, overlapping refresh jobs, and news with weak ESG relevance. The actual implementation includes a single-run guard, bounded company limits, per-company error handling, and category `neutral` when no rules match. Those mechanisms are more meaningful than simply calling an external feed and displaying raw headlines.

### Debugging data quality at provider boundaries

AI assisted in isolating a market-data integration defect where generic ticker normalization converted `Z74.SI` to an invalid Yahoo Finance symbol. The final change did not hard-code one company. It preserved recognized international suffixes such as `.SI`, `.AX`, `.TO`, `.L`, and `.HK`, while retaining normalization behavior for symbols that Yahoo expects in hyphenated form.

The hypothesis was validated first with a focused local provider request and then with the deployed endpoint, which returned the symbol, SGD currency, latest price, and daily OHLCV history. This is the research principle we applied throughout: provider-facing transformations must be verified against provider output, not inferred from a single naming convention.

## Validation Strategy

We treated generated ideas as hypotheses and required a relevant check before accepting them.

| Question | Evidence used |
|---|---|
| Does the classifier recognize basic positive environmental and severe controversy text? | Node unit tests for `classifyText`. |
| Are response contracts stable for the frontend? | Snake-case middleware unit tests and the production frontend build. |
| Does production preserve research data after redeployment? | Persisted company, signal, and snapshot counts plus authenticated dashboard requests. |
| Does SGX data resolve under the corrected ticker rule? | Local and deployed `stock-data` endpoint responses. |
| Does the research UI reach the authenticated backend reliably? | Fresh production login after Vercel same-origin `/api` proxy configuration. |
| Do notifications follow a recalculated score? | Alert evaluation after snapshot creation and notification test coverage. |

The production session issue provides a useful methodological example. An empty dashboard could have meant missing research data, a failed API, CORS failure, or a browser cookie-context issue. We checked the database and endpoint behavior before touching data, then selected the least invasive explanation that could be falsified. The same-origin Vercel proxy was adopted only after it restored authenticated dashboard responses without weakening the HTTP-only session model.

## Changes and Rejections

We changed or rejected AI suggestions when they did not satisfy technical or research-quality constraints:

1. **No fabricated completeness:** we did not claim every catalog company has a real-time quote. Private instruments and unsupported provider symbols keep an unavailable state.
2. **No CORS-only explanation:** CORS headers alone did not resolve browser third-party-cookie behavior, so the solution was a same-origin API proxy.
3. **No Singapore-only workaround:** ticker logic was generalized across known international suffixes rather than special-casing one company.
4. **No automatic reseed after apparent data loss:** persistent data was inspected before intervention, avoiding destructive recovery work.
5. **No untraceable generated claims:** the copilot and score interpretations are bounded by stored signals, evidence, metrics, and snapshots.
6. **No credentials in research artifacts:** environment secrets remain encrypted in hosting configuration and are excluded from documentation and exports.

## Limitations and Future Research Work

The current classifier is rule-based and therefore sensitive to vocabulary coverage, language, and context. It does not perform entity disambiguation across an article, detect quotation versus allegation, resolve contradictory sources, or estimate causal impact. Confidence currently represents rule/evidence support, not calibrated probability of truth.

The next research improvements would be to:

1. add source-quality and recency weights to signals;
2. distinguish allegation, investigation, ruling, and remediation stages for controversy events;
3. measure agreement across independent sources before increasing confidence;
4. evaluate category and sentiment accuracy on a labeled ESG-news validation set;
5. version scoring rules and preserve the rule version on each snapshot for reproducibility;
6. introduce time decay so old signals contribute less unless reinforced by later evidence; and
7. provide a source-level explanation view that shows every contribution to a pillar score.

These changes would make the system more suitable for longitudinal ESG research while preserving its present traceability.

## Conclusion

The main value of AI in this contribution was not replacing research judgment. It accelerated decomposition, surfaced edge cases, and made the pipeline easier to document and test. The team retained control of methodology by keeping source records separate from derived scores, validating provider data, retaining historical snapshots, and documenting uncertainty. That combination makes the system a research-support tool: it helps users find changes worth investigating, while leaving final interpretation to evidence review and human judgment.