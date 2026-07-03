# ESG Momentum Engine

> **AI-powered ESG intelligence that measures the *direction and speed* of ESG change before traditional annual reports and rating providers catch up.**

Unlike conventional ESG dashboards that report lagging annual data, the ESG Momentum Engine applies AI extraction, signal classification and momentum scoring to provide forward-looking investor intelligence.

---

## Quick Start

### 1. Backend (FastAPI + SQLite)

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env         # Windows
# cp .env.example .env         # macOS/Linux

# Start API server (auto-seeds database on first run)
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Frontend (React + Vite + Tailwind)

```bash
cd frontend

npm install
npm run dev
```

App available at: http://localhost:5173

---

## Database

**Default**: SQLite (`backend/esg_momentum.db`) — zero setup, works immediately.

**PostgreSQL** (recommended for production):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/esg_momentum
```

Then run:
```bash
createdb esg_momentum
uvicorn app.main:app --reload
```

---

## Seed Data

The app auto-seeds 5 companies on first startup:

| Company | Ticker | Classification | Momentum |
|---------|--------|----------------|----------|
| Tesla, Inc. | TSLA | Hidden Winner | +32 |
| Microsoft Corporation | MSFT | Future Leader | +45 |
| Shell plc | SHEL | Value Trap | -26 |
| Toyota Motor Corporation | TM | Overrated Leader | -21 |
| BYD Company Limited | BYDDF | Hidden Winner | +48 |

Each company has seeded ESG metrics, news signals, evidence items and 8 quarters of historical score snapshots so the dashboard works immediately.

---

## Architecture

```
polyfintech/
├── backend/
│   └── app/
│       ├── main.py              # FastAPI app, CORS, lifespan seeding
│       ├── config.py            # Settings (env-driven)
│       ├── database.py          # SQLAlchemy engine + session
│       ├── models/              # ORM models
│       │   ├── company.py
│       │   ├── report.py
│       │   ├── evidence.py
│       │   ├── esg_metric.py
│       │   ├── signal.py
│       │   └── score_snapshot.py
│       ├── schemas/             # Pydantic schemas
│       ├── routers/             # API endpoints
│       │   ├── companies.py     # CRUD + upload + copilot
│       │   ├── dashboard.py     # Dashboard aggregations
│       │   └── matrix.py        # ESG Matrix data
│       ├── agents/              # AI modular pipeline
│       │   ├── document_extractor.py   # PDF → structured KPIs
│       │   ├── signal_classifier.py    # Text → ESG category + sentiment
│       │   ├── momentum_scoring.py     # Signals → momentum score
│       │   ├── greenwashing_detector.py# Claims vs evidence analysis
│       │   ├── controversy_risk.py     # Risk scoring from signals
│       │   ├── ai_adoption.py          # AI transformation scoring
│       │   └── copilot.py              # Evidence-grounded Q&A
│       ├── services/
│       │   ├── scoring.py       # Orchestrates all agents → ScoreSnapshot
│       │   └── pdf_parser.py    # pdfplumber / PyMuPDF text extraction
│       └── seed/
│           └── seed_data.py     # Realistic company seed data
│
└── frontend/
    └── src/
        ├── App.tsx              # Router
        ├── api/client.ts        # Typed axios API client
        ├── types/index.ts       # TypeScript domain types
        ├── utils/helpers.ts     # Color, format, label utilities
        ├── components/
        │   ├── CompanySearchBar.tsx    # Google Finance-style search
        │   ├── MetricCard.tsx          # Metric display with bar
        │   ├── MomentumChart.tsx       # Recharts area chart
        │   ├── ESGMatrix.tsx           # 2×2 scatter matrix
        │   ├── EvidenceDrawer.tsx      # Slide-in evidence panel
        │   ├── ControversyTimeline.tsx # Timeline of signals
        │   ├── PeerBenchmarkTable.tsx  # Radar + table comparison
        │   ├── AIAdoptionPanel.tsx     # Radial gauge + breakdown
        │   ├── CopilotChat.tsx         # Evidence-grounded chat
        │   ├── WatchlistTable.tsx      # Google Finance-style table
        │   ├── InvestorSignalBadge.tsx # Classification/signal badges
        │   └── Navbar.tsx
        └── pages/
            ├── Dashboard.tsx      # Landing — watchlist + panels
            ├── CompanyDetail.tsx  # Full company intelligence page
            ├── MatrixPage.tsx     # ESG Momentum Matrix
            └── UploadPage.tsx     # PDF upload + extraction flow
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/companies` | Create company |
| GET | `/companies?q=` | List/search companies |
| GET | `/companies/{id}` | Get company with latest score |
| POST | `/companies/{id}/upload-report` | Upload PDF, extract ESG data |
| POST | `/companies/{id}/scan-signals` | Classify news signals |
| POST | `/companies/{id}/calculate-scores` | Run scoring pipeline |
| GET | `/companies/{id}/evidence` | Get evidence items |
| GET | `/companies/{id}/scores` | Get score history |
| POST | `/companies/{id}/copilot` | Ask AI copilot a question |
| GET | `/dashboard` | Dashboard aggregations |
| GET | `/matrix` | ESG Matrix data |

---

## Scoring Methodology

### Current ESG Score (0–100)

$$\text{ESG} = E \times 0.40 + S \times 0.30 + G \times 0.30$$

Each pillar is scored from metric data (60% weight) blended with signal sentiment (40% weight). When no metric data exists, signal-only scoring applies.

### ESG Momentum Score (−100 to +100)

$$\text{Momentum} = \sum_{p \in \{E,S,G\}} w_p \times \left( \text{SignalSentiment}_p + \text{YoYMetricChange}_p - \text{ControversyPenalty}_p \right) \times \text{RecencyDecay}$$

Signals from the last 90 days carry full weight. Weight decays linearly to 10% at 365 days.

### AI Adoption Score (0–100)

Composite of 6 signal buckets:

| Bucket | Weight |
|--------|--------|
| AI Hiring | 20% |
| AI Patents | 20% |
| AI Products | 20% |
| AI Partnerships | 15% |
| AI Infrastructure | 15% |
| Automation | 10% |

### Controversy Risk Score (0–100)

$$\text{Risk} = \sum_i \left( \text{BaseScore}_{\text{category}} + \text{Severity}_i \times 1.5 \right) \times \text{RecencyFactor}_i$$

Score above **75** overrides investor signal to **Risk Alert** regardless of ESG score.

### Classification Rules

| Condition | Classification | Investor Signal |
|-----------|---------------|----------------|
| ESG < 60 AND Momentum > +20 | 💎 Hidden Winner | Buy / Watchlist |
| ESG ≥ 60 AND Momentum > +20 | 🚀 Future Leader | Buy / Watchlist |
| ESG < 60 AND Momentum < −20 | 🪤 Value Trap | Avoid |
| ESG ≥ 60 AND Momentum < −20 | ⚠️ Overrated Leader | Hold |
| Everything else | 👁 Watchlist | Hold |
| Controversy Risk > 75 | Override → Risk Alert | Risk Alert |

### Confidence Score (0–1)

Based on evidence volume + average source confidence. A company with 50+ high-quality evidence items scores above 0.90. A company with only manual signals scores around 0.30.

---

## AI Layer — Upgrading from Mock to Real LLM

All AI agents use mock implementations that can be replaced with real LLM calls without changing any other code:

### DocumentExtractorAgent
```python
# app/agents/document_extractor.py
# Replace mock_llm_extract() with:
import openai
def real_llm_extract(text, page_num):
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": ESG_EXTRACTION_PROMPT + text}]
    )
    return json.loads(response.choices[0].message.content)
```

### CopilotAgent
```python
# app/agents/copilot.py
# Replace _mock_answer() with:
def real_answer(question, evidence, company_name):
    context = "\n".join([e.evidence_text for e in evidence])
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "Answer using only the evidence provided. Cite sources."},
            {"role": "user", "content": f"Evidence:\n{context}\n\nQuestion: {question}"}
        ]
    )
    return response.choices[0].message.content
```

Set `OPENAI_API_KEY` in `.env` and `USE_MOCK_LLM=false` to enable real LLM calls.

---

## Design Principles

- **Evidence-first**: Every score links to extracted evidence. No score without citation.
- **Transparency**: Classification rules are in `app/services/scoring.py`. All thresholds are editable constants.
- **Modular AI**: Each agent is a standalone service. Swap mock → real LLM without touching business logic.
- **Forward-looking**: Momentum scores use recency-weighted signals, not just annual report data.
- **Investor-grade UX**: Financial dashboard aesthetic. Charts and tables over paragraphs.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| API Client | Axios |
| Router | React Router v6 |
| Backend | FastAPI + Python 3.11+ |
| ORM | SQLAlchemy 2.0 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| PDF Parsing | pdfplumber + PyMuPDF |
| AI Pipeline | Modular agents (mock LLM → aryanAI for real use) |

---

## Greenwashing Detection

The `GreenwashingDetectorAgent` flags:

- **No Scope 3 data** — Most significant emissions gap, high risk
- **Unaudited net zero targets** — Claims without third-party verification
- **Vague sustainability language** — "We are committed to..." without metrics
- **Missing baseline years** — Targets without measurable starting points

Greenwashing risk score (0–100) is shown on the company page and informs the confidence score.

---

## Contributing / Extending

**Add a new signal source:**
1. Call `signal_classifier_agent.classify(title, body, source, date)` 
2. Store result as a `Signal` record
3. Run `calculate_scores(company_id, db)` to refresh

**Add a new ESG metric:**
1. Add a pattern to `METRIC_PATTERNS` in `document_extractor.py`
2. Upload a PDF containing the metric
3. Score recalculates automatically

**Add a new classification:**
1. Edit `classify()` in `app/services/scoring.py`
2. Add the badge color in `frontend/src/utils/helpers.ts`
