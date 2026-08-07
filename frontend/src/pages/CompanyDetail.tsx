import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, BookOpen, MessageSquare, AlertTriangle,
  TrendingUp, Globe, Building, ChevronRight, ExternalLink, Lightbulb,
  Download, Printer, Link2, Newspaper, ZoomIn, ZoomOut, BarChart3,
  Bookmark, BookmarkCheck, Flame, Sparkles,
  Coins,
} from 'lucide-react'
import {
  getCompany, getScoreHistory, getEvidence, getCompanyReports, getStockData, calculateScores, searchCompanies,
  addWatchlistItem, removeWatchlistItem, getWatchlist, getCompanyQuantAnalytics, getNews,
} from '../api/client'
import type { Company, ScoreSnapshot, Evidence, Report, StockData, StockRange, CompanyQuantAnalytics, NewsSignal } from '../types'
import MomentumChart from '../components/MomentumChart'
import StockPriceChart from '../components/StockPriceChart'
import EvidenceDrawer from '../components/EvidenceDrawer'
import CopilotChat from '../components/CopilotChat'
import AILabPanel from '../components/AILabPanel'
import AIAdoptionPanel from '../components/AIAdoptionPanel'
import ControversyTimeline from '../components/ControversyTimeline'
import PeerBenchmarkTable from '../components/PeerBenchmarkTable'
import ESGMatrix from '../components/ESGMatrix'
import ScoreBreakdownChart from '../components/ScoreBreakdownChart'
import QuantAnalyticsPanel from '../components/QuantAnalyticsPanel'
import { ClassificationBadge, InvestorSignalBadge, ControversyPulse } from '../components/InvestorSignalBadge'
import CompanyLogo from '../components/CompanyLogo'
import ScoreRing from '../components/ScoreRing'
import Tilt3D from '../components/Tilt3D'
import MomentumRadar from '../components/MomentumRadar'
import ESGHeatmap from '../components/ESGHeatmap'
import CompanyComparisonPanel from '../components/CompanyComparisonPanel'
import {
  momentumColor, esgScoreColor, fmtPct, fmt0, fmt1,
  confidenceLabel, confidenceColor, formatDate,
} from '../utils/helpers'
import { buildPeRatioLink, downloadTextFile } from '../utils/links'
import { clsx } from 'clsx'

type Tab = 'overview' | 'ai-lab' | 'dividends' | 'evidence' | 'signals' | 'copilot' | 'peers'
type ChartMetric = 'all' | 'esg' | 'momentum' | 'ai' | 'risk'
type ChartRange = 'all' | 'year' | 'half' | 'quarter'

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const companyId = parseInt(id ?? '0')

  const [company, setCompany] = useState<Company | null>(null)
  const [scores, setScores] = useState<ScoreSnapshot[]>([])
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [peers, setPeers] = useState<Company[]>([])
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)
  const [showEvidence, setShowEvidence] = useState(false)
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stockLoading, setStockLoading] = useState(false)
  const [stockError, setStockError] = useState<string | null>(null)
  const [stockRange, setStockRange] = useState<StockRange>('1mo')
  const [chartMetric, setChartMetric] = useState<ChartMetric>('all')
  const [chartRange, setChartRange] = useState<ChartRange>('all')
  const [chartZoom, setChartZoom] = useState(0)
  const [comparisonPeerId, setComparisonPeerId] = useState<number | null>(null)
  const [savedToWatchlist, setSavedToWatchlist] = useState(false)
  const [watchlistBusy, setWatchlistBusy] = useState(false)
  const [quantAnalytics, setQuantAnalytics] = useState<CompanyQuantAnalytics | null>(null)
  const [showComparison, setShowComparison] = useState(false)
  const [newsSignals, setNewsSignals] = useState<NewsSignal[]>([])
  const [newsLoading, setNewsLoading] = useState(false)

  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    Promise.all([
      getCompany(companyId),
      getScoreHistory(companyId),
      getEvidence(companyId),
      getCompanyReports(companyId),
      getWatchlist(),
      getCompanyQuantAnalytics(companyId),
      getNews(100, undefined, companyId),
    ])
      .then(([co, sc, ev, rp, wl, qa, news]) => {
        setCompany(co)
        setScores(sc)
        setEvidence(ev)
        setReports(rp)
        setQuantAnalytics(qa)
        setNewsSignals(news)
        setSelectedReportId(rp[0]?.id ?? null)
        setSavedToWatchlist(wl.some(item => item.id === companyId))
        // Load peers (all companies for comparison)
        searchCompanies().then(all => {
          const peerList = all.filter(c => c.id !== companyId).slice(0, 5)
          setPeers(peerList)
          setComparisonPeerId(peerList[0]?.id ?? null)
        })
      })
      .catch(() => setError('Failed to load company data.'))
      .finally(() => setLoading(false))
  }, [companyId])

  useEffect(() => {
    if (!companyId || tab !== 'signals') return

    const loadNews = async () => {
      setNewsLoading(true)
      try {
        setNewsSignals(await getNews(100, undefined, companyId))
      } finally {
        setNewsLoading(false)
      }
    }

    void loadNews()
    const interval = window.setInterval(() => void loadNews(), 60_000)
    return () => window.clearInterval(interval)
  }, [companyId, tab])

  const loadStockData = useCallback(async () => {
    if (!company?.ticker) {
      setStockData(null)
      setStockError('This company does not have a ticker symbol.')
      return
    }

    setStockLoading(true)
    setStockError(null)

    try {
      const data = await getStockData(companyId, stockRange)
      setStockData(data)
      if (!data) {
        setStockError('Live market data is temporarily unavailable.')
      }
    } catch {
      setStockData(null)
      setStockError('Unable to load live market data right now.')
    } finally {
      setStockLoading(false)
    }
  }, [company?.ticker, companyId, stockRange])

  useEffect(() => {
    void loadStockData()
  }, [loadStockData])

  useEffect(() => {
    setChartZoom(0)
  }, [chartRange, companyId])

  const handleRecalculate = async () => {
    setRecalculating(true)
    try {
      await calculateScores(companyId)
      const [co, sc] = await Promise.all([getCompany(companyId), getScoreHistory(companyId)])
      setCompany(co)
      setScores(sc)
    } catch {
      setError('Score recalculation failed.')
    } finally {
      setRecalculating(false)
    }
  }

  const handleToggleWatchlist = async () => {
    setWatchlistBusy(true)
    try {
      if (savedToWatchlist) {
        await removeWatchlistItem(companyId)
        setSavedToWatchlist(false)
      } else {
        await addWatchlistItem(companyId)
        setSavedToWatchlist(true)
      }
    } finally {
      setWatchlistBusy(false)
    }
  }

  const rangeScores = scores.filter(snapshot => {
    if (!snapshot.created_at) return true
    const age = Date.now() - new Date(snapshot.created_at).getTime()
    const day = 1000 * 60 * 60 * 24
    if (chartRange === 'quarter') return age <= day * 120
    if (chartRange === 'half') return age <= day * 210
    if (chartRange === 'year') return age <= day * 395
    return true
  })
  const maxChartZoom = Math.max(0, Math.floor((rangeScores.length - 3) / 2))
  const zoomWindow = chartZoom > 0 ? Math.max(3, rangeScores.length - chartZoom * 2) : undefined
  const visibleScores = zoomWindow ? rangeScores.slice(Math.max(0, rangeScores.length - zoomWindow)) : rangeScores

  if (loading) return <LoadingScreen />
  if (error || !company) return <ErrorScreen message={error ?? 'Company not found'} onBack={() => navigate('/')} />

  const latest = company.latest_score
  const greedIndex = latest
    ? Math.max(0, Math.min(100, Math.round(
      50
      + latest.momentum_score * 0.7
      + (latest.current_esg_score - 50) * 0.2
      - latest.controversy_risk * 0.5,
    )))
    : 50

  const greedLabel = greedIndex >= 75 ? 'Extreme greed' : greedIndex >= 55 ? 'Greed' : greedIndex >= 45 ? 'Neutral' : greedIndex >= 25 ? 'Fear' : 'Extreme fear'
  const dividendHistory = [...(stockData?.dividends ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const quarterlyProgress = stockData?.quarterly_progress ?? []
  const annualDividend = stockData?.annual_dividend ?? dividendHistory.reduce((acc, point) => acc + point.amount, 0)
  const dividendYield = stockData?.dividend_yield ?? (stockData?.quote.last_price && annualDividend ? (annualDividend / stockData.quote.last_price) * 100 : null)
  const moneyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: stockData?.quote.currency ?? 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  })
  const formatMoney = (value: number | null | undefined) => (value === null || value === undefined ? '—' : moneyFormatter.format(value))

  // Build matrix entry for mini matrix
  const matrixEntries = latest ? [{
    company: { id: company.id, name: company.name, ticker: company.ticker, industry: company.industry, country: company.country, description: company.description, logo_url: company.logo_url, website_url: company.website_url, executive_name: company.executive_name, executive_url: company.executive_url, market_cap: company.market_cap },
    current_esg_score: latest.current_esg_score,
    momentum_score: latest.momentum_score,
    classification: latest.classification,
    investor_signal: latest.investor_signal,
  }] : []

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'ai-lab', label: 'AI Lab', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'dividends', label: 'Dividends', icon: <Coins className="w-3.5 h-3.5" /> },
    { id: 'evidence', label: `Evidence (${evidence.length})`, icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'signals', label: `News (${newsSignals.length})`, icon: <Newspaper className="w-3.5 h-3.5" /> },
    { id: 'copilot', label: 'AI Copilot', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'peers', label: 'Peer Compare', icon: <Globe className="w-3.5 h-3.5" /> },
  ]

  const peRatioUrl = buildPeRatioLink(company.ticker, company.name)
  const visibleEvidence = selectedReportId ? evidence.filter(ev => ev.report_id === selectedReportId) : evidence
  const selectedReport = reports.find(report => report.id === selectedReportId) ?? null
  const comparisonPeer = peers.find(peer => peer.id === comparisonPeerId) ?? peers[0] ?? null
  const previousScore = scores[1] ?? null

  const buildComparisonReport = () => {
    if (!comparisonPeer || !company.latest_score || !comparisonPeer.latest_score) return ''

    const primary = company.latest_score
    const secondary = comparisonPeer.latest_score
    const scoreDelta = primary.current_esg_score - secondary.current_esg_score
    const momentumDelta = primary.momentum_score - secondary.momentum_score
    const aiDelta = primary.ai_adoption_score - secondary.ai_adoption_score
    const riskDelta = primary.controversy_risk - secondary.controversy_risk

    const winner = scoreDelta >= 0 ? company.name : comparisonPeer.name
    const loser = scoreDelta >= 0 ? comparisonPeer.name : company.name

    return [
      `Comparison Report`,
      `${company.name} vs ${comparisonPeer.name}`,
      '',
      'Overview',
      `- ${company.name}: ESG ${fmt1(primary.current_esg_score)}, Momentum ${primary.momentum_score > 0 ? '+' : ''}${fmt1(primary.momentum_score)}, AI ${fmt1(primary.ai_adoption_score)}, Risk ${fmt1(primary.controversy_risk)}, ${primary.classification}`,
      `- ${comparisonPeer.name}: ESG ${fmt1(secondary.current_esg_score)}, Momentum ${secondary.momentum_score > 0 ? '+' : ''}${fmt1(secondary.momentum_score)}, AI ${fmt1(secondary.ai_adoption_score)}, Risk ${fmt1(secondary.controversy_risk)}, ${secondary.classification}`,
      '',
      'Key Deltas',
      `- ESG advantage: ${scoreDelta >= 0 ? company.name : comparisonPeer.name} by ${fmt1(Math.abs(scoreDelta))}`,
      `- Momentum delta: ${momentumDelta >= 0 ? '+' : ''}${fmt1(momentumDelta)} in favour of ${momentumDelta >= 0 ? company.name : comparisonPeer.name}`,
      `- AI adoption delta: ${aiDelta >= 0 ? '+' : ''}${fmt1(aiDelta)} in favour of ${aiDelta >= 0 ? company.name : comparisonPeer.name}`,
      `- Controversy delta: ${riskDelta >= 0 ? '+' : ''}${fmt1(riskDelta)} in favour of ${riskDelta <= 0 ? company.name : comparisonPeer.name}`,
      '',
      'Summary',
      `${winner} leads on current ESG score, while ${loser} trails by ${fmt1(Math.abs(scoreDelta))} points. Use the momentum and risk deltas to judge whether the lead is improving or deteriorating.`,
    ].join('\n')
  }

  const handleDownloadComparisonReport = () => {
    const report = buildComparisonReport()
    if (!report || !comparisonPeer) return
    downloadTextFile(
      `${company.ticker ?? company.id}-vs-${comparisonPeer.ticker ?? comparisonPeer.id}-comparison-report.txt`,
      report,
      'text/plain;charset=utf-8',
    )
  }

  const scoreBreakdown = latest ? [
    { label: 'ESG', value: latest.current_esg_score, color: '#3b82f6' },
    { label: 'Momentum', value: Math.max(0, (latest.momentum_score + 100) / 2), color: '#10b981' },
    { label: 'AI', value: latest.ai_adoption_score, color: '#8b5cf6' },
    { label: 'Risk', value: latest.controversy_risk, color: '#ef4444' },
  ] : []

  const buildEsgReport = () => {
    const scoreLines = latest ? [
      `Current ESG: ${fmt1(latest.current_esg_score)}/100`,
      `Momentum: ${latest.momentum_score > 0 ? '+' : ''}${fmt1(latest.momentum_score)}`,
      `AI Adoption: ${fmt1(latest.ai_adoption_score)}/100`,
      `Controversy Risk: ${fmt1(latest.controversy_risk)}/100`,
      `Confidence: ${fmtPct(latest.confidence_score)}`,
      `Classification: ${latest.classification}`,
      `Investor Signal: ${latest.investor_signal}`,
    ] : ['No latest score available']

    const historyLines = scores.slice(0, 6).map(snapshot => {
      const date = snapshot.created_at ? formatDate(snapshot.created_at) : 'Unknown date'
      return `${date} | ESG ${fmt1(snapshot.current_esg_score)} | Momentum ${snapshot.momentum_score > 0 ? '+' : ''}${fmt1(snapshot.momentum_score)} | AI ${fmt1(snapshot.ai_adoption_score)} | Risk ${fmt1(snapshot.controversy_risk)}`
    })

    const newsLines = newsSignals.slice(0, 5).map(signal => {
      const date = signal.date ? formatDate(signal.date) : 'Unknown date'
      return `${date} | ${signal.title} | ${signal.source ?? 'Source'} | ${signal.category}`
    })

    return [
      `ESG Report - ${company.name}`,
      `Ticker: ${company.ticker ?? 'N/A'}`,
      `Exchange: ${company.exchange ?? 'N/A'}`,
      `Industry: ${company.industry ?? 'N/A'}`,
      `Country: ${company.country ?? 'N/A'}`,
      `Market Cap: ${company.market_cap ?? 'N/A'}`,
      '',
      'Summary',
      company.description ?? 'No company description available.',
      '',
      'Latest Scores',
      ...scoreLines.map(line => `- ${line}`),
      '',
      'Score History',
      ...(historyLines.length ? historyLines.map(line => `- ${line}`) : ['- No score history available']),
      '',
      'Recent News / Signals',
      ...(newsLines.length ? newsLines.map(line => `- ${line}`) : ['- No recent news available']),
      '',
      `Evidence Count: ${evidence.length}`,
    ].join('\n')
  }

  const exportBundle = {
    company: {
      id: company.id,
      name: company.name,
      ticker: company.ticker,
      exchange: company.exchange,
      industry: company.industry,
      country: company.country,
      market_cap: company.market_cap,
      description: company.description,
      logo_url: company.logo_url,
      website_url: company.website_url,
      executive_name: company.executive_name,
      executive_url: company.executive_url,
    },
    latest_score: latest,
    score_history: scores,
    recent_news: newsSignals.slice(0, 10),
    evidence_count: evidence.length,
  }

  const handleExportJson = () => {
    downloadTextFile(`${company.ticker ?? company.id}-analysis.json`, JSON.stringify(exportBundle, null, 2), 'application/json;charset=utf-8')
  }

  const handleExportCsv = () => {
    const rows = [
      ['Field', 'Value'],
      ['Company', company.name],
      ['Ticker', company.ticker ?? ''],
      ['Exchange', company.exchange ?? ''],
      ['Industry', company.industry ?? ''],
      ['Country', company.country ?? ''],
      ['Market Cap', company.market_cap ?? ''],
      ['Current ESG Score', latest ? fmt1(latest.current_esg_score) : ''],
      ['Momentum Score', latest ? fmt1(latest.momentum_score) : ''],
      ['AI Adoption Score', latest ? fmt1(latest.ai_adoption_score) : ''],
      ['Controversy Risk', latest ? fmt1(latest.controversy_risk) : ''],
      ['Confidence', latest ? fmtPct(latest.confidence_score) : ''],
      ['Evidence Count', String(evidence.length)],
    ]
    const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadTextFile(`${company.ticker ?? company.id}-analysis.csv`, csv, 'text/csv;charset=utf-8')
  }

  const handleExportEsgReport = () => {
    downloadTextFile(`${company.ticker ?? company.id}-esg-report.txt`, buildEsgReport(), 'text/plain;charset=utf-8')
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Company header */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <CompanyLogo ticker={company.ticker} name={company.name} logoUrl={company.logo_url} size="lg" />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              {company.ticker && (
                <span className="text-sm font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {company.ticker}
                </span>
              )}
              {latest && <ClassificationBadge classification={latest.classification} />}
              {latest && <InvestorSignalBadge signal={latest.investor_signal} />}
              <ControversyPulse risk={latest?.controversy_risk} />
            </div>

            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-500">
              {company.industry && <span className="flex items-center gap-1"><Building className="w-3 h-3" />{company.industry}</span>}
              {company.country && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{company.country}</span>}
              {company.market_cap && <span>Market Cap: {company.market_cap}</span>}
            </div>

            {company.description && (
              <p className="text-sm text-slate-500 mt-2 leading-relaxed max-w-2xl">{company.description}</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <button onClick={handleToggleWatchlist} disabled={watchlistBusy} className="btn-secondary text-xs">
                {savedToWatchlist ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                {savedToWatchlist ? 'Saved to Watchlist' : 'Save to Watchlist'}
              </button>
              {company.website_url && (
                <a href={company.website_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Website
                </a>
              )}
              {company.executive_url && (
                <a href={company.executive_url} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
                  <Link2 className="w-3.5 h-3.5" />
                  {company.executive_name ?? 'Executive'}
                </a>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button onClick={handleRecalculate} disabled={recalculating} className="btn-secondary text-xs">
              <RefreshCw className={clsx('w-3.5 h-3.5', recalculating && 'animate-spin')} />
              Recalculate
            </button>
            <button onClick={() => setShowEvidence(true)} className="btn-secondary text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              Evidence
            </button>
          </div>
        </div>

        {latest && (
          <div className="mt-4 grid gap-3 sm:grid-cols-[220px_1fr] items-center rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <Flame className="h-4 w-4" />
              Greed Index
            </div>
            <div>
              <div className="flex items-center justify-between text-xs text-amber-800">
                <span>{greedLabel}</span>
                <span>{greedIndex}/100</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-amber-100 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" style={{ width: `${greedIndex}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card p-4 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-label mb-1">Research tools</div>
            <div className="text-sm font-medium text-slate-900">P/E link, PDF export, CSV and JSON downloads</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={peRatioUrl} target="_blank" rel="noreferrer" className="btn-secondary text-xs">
              <Link2 className="w-3.5 h-3.5" />
              P/E Ratio
            </a>
            <button onClick={handleExportEsgReport} className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" />
              ESG Report
            </button>
            <button onClick={handleExportJson} className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" />
              JSON
            </button>
            <button onClick={handleExportCsv} className="btn-secondary text-xs">
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>
            <button onClick={() => window.print()} className="btn-primary text-xs">
              <Printer className="w-3.5 h-3.5" />
              PDF / Print
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <div className="section-label mb-1">Report archive</div>
            <div className="text-sm font-medium text-slate-900">Open an uploaded report to inspect its extracted evidence</div>
          </div>
          {selectedReport && (
            <button onClick={() => { setSelectedReportId(null); setTab('evidence') }} className="btn-secondary text-xs">
              Clear selection
            </button>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="text-sm text-slate-400">No uploaded reports yet. Use the upload page to add one.</div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {reports.map(report => {
              const active = report.id === selectedReportId
              return (
                <button
                  key={report.id}
                  onClick={() => { setSelectedReportId(report.id); setTab('evidence') }}
                  className={clsx(
                    'text-left rounded-xl border p-3 transition-colors',
                    active
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">{report.file_name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {report.year ?? 'Unknown year'} · {report.status}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">#{report.id}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{report.page_count ?? 0} pages</span>
                    <span>{report.uploaded_at ? formatDate(report.uploaded_at) : 'Just now'}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Animated Score Rings */}
      {latest && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
          <Tilt3D className="card p-5 flex flex-col items-center gap-2 cursor-default animate-fade-up" intensity={6}>
            <ScoreRing
              value={latest.current_esg_score}
              size={88}
              label="ESG Score"
              subLabel="/ 100"
            />
            <div className="text-center w-full">
              <div className="text-[10px] text-slate-400">
                E&thinsp;{fmt0(latest.environmental_score ?? 0)}
                &nbsp;&middot;&nbsp;
                S&thinsp;{fmt0(latest.social_score ?? 0)}
                &nbsp;&middot;&nbsp;
                G&thinsp;{fmt0(latest.governance_score ?? 0)}
              </div>
            </div>
          </Tilt3D>

          <Tilt3D className="card p-5 flex flex-col items-center gap-2 cursor-default animate-fade-up delay-75" intensity={6}>
            <ScoreRing
              value={Math.max(0, (latest.momentum_score + 100) / 2)}
              displayValue={latest.momentum_score}
              max={100}
              size={88}
              color={latest.momentum_score > 20 ? '#10b981' : latest.momentum_score < -20 ? '#ef4444' : '#f59e0b'}
              label="Momentum"
              subLabel={latest.momentum_score > 5 ? 'Rising' : latest.momentum_score < -5 ? 'Declining' : 'Stable'}
            />
            <div className="text-[10px] text-slate-400 text-center">Range −100 to +100</div>
          </Tilt3D>

          <Tilt3D className="card p-5 flex flex-col items-center gap-2 cursor-default animate-fade-up delay-150" intensity={6}>
            <ScoreRing
              value={latest.ai_adoption_score}
              size={88}
              color="#8b5cf6"
              label="AI Adoption"
              subLabel="/ 100"
            />
            <div className="text-[10px] text-slate-400 text-center">Hiring · Patents · Products</div>
          </Tilt3D>

          <Tilt3D className="card p-5 flex flex-col items-center gap-2 cursor-default animate-fade-up delay-225" intensity={6}>
            <ScoreRing
              value={latest.controversy_risk}
              size={88}
              invertColors
              label="Controversy"
              subLabel={latest.controversy_risk > 75 ? 'ALERT' : '/ 100'}
            />
            <div className={clsx(
              'text-[10px] font-semibold text-center',
              latest.controversy_risk > 75 ? 'text-red-500' :
              latest.controversy_risk > 40 ? 'text-amber-600' : 'text-emerald-600'
            )}>
              {latest.controversy_risk > 75 ? 'Risk Alert Active' :
               latest.controversy_risk > 40 ? 'Monitor Closely' : 'Low Risk'}
            </div>
          </Tilt3D>

          <Tilt3D className="card p-5 flex flex-col items-center gap-2 cursor-default animate-fade-up delay-300" intensity={6}>
            <ScoreRing
              value={latest.confidence_score * 100}
              size={88}
              label="Confidence"
              subLabel={confidenceLabel(latest.confidence_score)}
            />
            <div className="text-[10px] text-slate-400 text-center">{evidence.length} source{evidence.length !== 1 ? 's' : ''}</div>
          </Tilt3D>
        </div>
      )}

      {/* Classification reason */}
      {latest && (
        <ClassificationExplanation score={latest} />
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                tab === t.id
                  ? 'border-emerald-500 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <StockPriceChart
            data={stockData}
            loading={stockLoading}
            selectedRange={stockRange}
            onRangeChange={setStockRange}
            onRefresh={loadStockData}
          />

          {stockError && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              {stockError}
            </div>
          )}

          <QuantAnalyticsPanel analytics={quantAnalytics} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Chart */}
          <div className="lg:col-span-2 card p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-900 text-sm">ESG Score & Momentum Trend</h2>
                <p className="text-xs text-slate-400">Use the controls to zoom and switch the active signal.</p>
              </div>
              <span className="text-xs text-slate-400">{visibleScores.length} data points</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1">Metric</span>
              {[
                ['all', 'All'],
                ['esg', 'ESG'],
                ['momentum', 'Momentum'],
                ['ai', 'AI'],
                ['risk', 'Risk'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setChartMetric(value as ChartMetric)}
                  className={clsx(
                    'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                    chartMetric === value
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  )}
                >
                  {label}
                </button>
              ))}

              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 mr-1">Range</span>
              {[
                ['all', 'All'],
                ['year', '1Y'],
                ['half', '6M'],
                ['quarter', '3M'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setChartRange(value as ChartRange)}
                  className={clsx(
                    'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                    chartRange === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                  )}
                >
                  {label}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setChartZoom(z => Math.max(0, z - 1))} disabled={chartZoom === 0} className="btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                  <ZoomOut className="w-3.5 h-3.5" />
                  Zoom out
                </button>
                <button onClick={() => setChartZoom(z => Math.min(maxChartZoom, z + 1))} disabled={chartZoom >= maxChartZoom} className="btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                  <ZoomIn className="w-3.5 h-3.5" />
                  Zoom in
                </button>
              </div>
            </div>

            <MomentumChart snapshots={visibleScores} height={280} focusMetric={chartMetric} />
          </div>

          {/* AI Adoption */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">AI Adoption</h2>
            <AIAdoptionPanel
              score={latest?.ai_adoption_score ?? 0}
              signalCount={evidence.filter(e => e.category === 'ai_adoption').length}
            />
          </div>

          {/* Mini matrix */}
          <div className="lg:col-span-2 card p-5">
            <h2 className="font-semibold text-slate-900 text-sm mb-1">ESG Momentum Matrix Position</h2>
            <p className="text-xs text-slate-400 mb-3">Where this company sits in the quadrant framework</p>
            {matrixEntries.length > 0 && latest ? (
              <div className="space-y-4">
                <ESGMatrix entries={matrixEntries} height={300} interactive={false} />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="section-label mb-1">X Axis</div>
                    <div className={clsx('font-bold text-lg', esgScoreColor(latest.current_esg_score))}>
                      {fmt0(latest.current_esg_score)}
                    </div>
                    <div className="text-xs text-slate-400">Current ESG Score</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="section-label mb-1">Y Axis</div>
                    <div className={clsx('font-bold text-lg', momentumColor(latest.momentum_score))}>
                      {latest.momentum_score > 0 ? '+' : ''}{fmt1(latest.momentum_score)}
                    </div>
                    <div className="text-xs text-slate-400">Momentum Score</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-sm text-center py-8">No score data available</div>
            )}
          </div>

          {/* Recent signals */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-slate-900 text-sm mb-4">Latest News</h2>
            <ControversyTimeline signals={newsSignals.slice(0, 5)} limit={5} />
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-900 text-sm">Score Breakdown</h2>
                <p className="text-xs text-slate-400">Latest company score composition</p>
              </div>
              <BarChart3 className="h-4 w-4 text-slate-400" />
            </div>
            <ScoreBreakdownChart scores={scoreBreakdown} height={220} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <MomentumRadar latest={latest ?? null} previous={scores.length > 1 ? scores[scores.length - 2] : null} />
            <CompanyComparisonPanel
              baseCompany={company}
              baseScore={latest ?? null}
              open={showComparison}
              onClose={() => setShowComparison(false)}
            />
            {!showComparison && (
              <button
                onClick={() => setShowComparison(true)}
                className="card p-5 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-colors cursor-pointer border-2 border-dashed"
              >
                <span className="text-lg font-bold">Compare</span>
                <span className="text-xs text-slate-400">Pick a peer to compare side-by-side</span>
              </button>
            )}
          </div>

          <ESGHeatmap scores={scores} weeks={16} />
          </div>
        </div>
      )}

      {tab === 'ai-lab' && (
        <AILabPanel
          company={company}
          latest={latest ?? null}
          previousScore={previousScore}
          signals={newsSignals}
          stockData={stockData}
          onOpenCopilot={() => setTab('copilot')}
        />
      )}

      {tab === 'dividends' && (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="card p-4">
              <div className="section-label mb-1">Annual dividend</div>
              <div className="text-2xl font-bold text-slate-900">{formatMoney(annualDividend)}</div>
              <div className="text-xs text-slate-400">Per share, trailing 12 months</div>
            </div>
            <div className="card p-4">
              <div className="section-label mb-1">Dividend yield</div>
              <div className="text-2xl font-bold text-emerald-600">{dividendYield === null ? '—' : `${dividendYield.toFixed(2)}%`}</div>
              <div className="text-xs text-slate-400">Based on trailing dividends and last price</div>
            </div>
            <div className="card p-4">
              <div className="section-label mb-1">Last dividend</div>
              <div className="text-2xl font-bold text-slate-900">{dividendHistory[0] ? formatMoney(dividendHistory[0].amount) : '—'}</div>
              <div className="text-xs text-slate-400">{stockData?.last_dividend_date ? formatDate(stockData.last_dividend_date) : 'No dividend record'}</div>
            </div>
            <div className="card p-4">
              <div className="section-label mb-1">Quarterly snapshots</div>
              <div className="text-2xl font-bold text-slate-900">{quarterlyProgress.length}</div>
              <div className="text-xs text-slate-400">Latest revenue and earnings updates</div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm">Dividend history</h2>
                  <p className="text-xs text-slate-400">Most recent payments from Yahoo Finance data.</p>
                </div>
                <Coins className="h-4 w-4 text-amber-600" />
              </div>
              {dividendHistory.length === 0 ? (
                <div className="text-sm text-slate-400">No dividend history available for this ticker.</div>
              ) : (
                <div className="space-y-2">
                  {dividendHistory.map(point => (
                    <div key={point.date} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-sm font-medium text-slate-900">{formatDate(point.date)}</div>
                      <div className="text-sm font-semibold text-amber-700">{formatMoney(point.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-semibold text-slate-900 text-sm">Quarterly progress</h2>
                  <p className="text-xs text-slate-400">Revenue and earnings momentum by quarter.</p>
                </div>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </div>
              {quarterlyProgress.length === 0 ? (
                <div className="text-sm text-slate-400">No quarterly financial data available for this ticker.</div>
              ) : (
                <div className="space-y-3">
                  {quarterlyProgress.map(point => {
                    const barWidth = stockData?.quarterly_progress.reduce((max, item) => Math.max(max, item.revenue ?? 0), 0) ?? 1
                    const width = point.revenue ? Math.max(8, Math.round((point.revenue / Math.max(barWidth, 1)) * 100)) : 8
                    return (
                      <div key={point.period} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{formatDate(point.period)}</div>
                            <div className="text-xs text-slate-400">Revenue {formatMoney(point.revenue)} · Earnings {formatMoney(point.earnings)}</div>
                          </div>
                          <div className="text-right text-xs text-slate-500">
                            <div>Rev {point.revenue_growth === null ? '—' : `${point.revenue_growth.toFixed(1)}%`}</div>
                            <div>EPS/NI {point.earnings_growth === null ? '—' : `${point.earnings_growth.toFixed(1)}%`}</div>
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{ width: `${width}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'evidence' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">All Evidence</h2>
              <p className="text-xs text-slate-400">
                {selectedReport ? `Showing report #${selectedReport.id} · ${selectedReport.file_name}` : 'Showing all uploaded evidence'}
              </p>
            </div>
            <span className="text-xs text-slate-400">{visibleEvidence.length} items · AI-extracted</span>
          </div>
          <div className="divide-y divide-slate-50">
            {visibleEvidence.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-400">
                No evidence yet. Upload a sustainability report to extract evidence.
              </div>
            )}
            {visibleEvidence.map(ev => (
              <EvidenceRow key={ev.id} evidence={ev} />
            ))}
          </div>
        </div>
      )}

      {tab === 'signals' && (
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">News & Signals</h2>
              <p className="text-xs text-slate-400">Live RSS coverage and classified company signals.</p>
            </div>
            <span className="badge-slate">{newsSignals.length} items</span>
          </div>
          {newsLoading && <div className="mb-3 text-xs text-slate-400">Refreshing coverage...</div>}
          <ControversyTimeline
            signals={newsSignals}
            limit={100}
          />
        </div>
      )}

      {tab === 'copilot' && (
        <div className="card overflow-hidden" style={{ height: '600px' }}>
          <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
            <MessageSquare className="w-4 h-4 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">ESG Copilot — {company.name}</h2>
          </div>
          <div className="h-[calc(100%-57px)]">
            <CopilotChat companyId={companyId} companyName={company.name} />
          </div>
        </div>
      )}

      {tab === 'peers' && (
        <div className="card p-5">
          <h2 className="font-semibold text-slate-900 mb-1">Peer Comparison</h2>
          <p className="text-xs text-slate-400 mb-4">Benchmarking against {peers.length} peer companies</p>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <select
              value={comparisonPeerId ?? ''}
              onChange={e => setComparisonPeerId(e.target.value ? Number(e.target.value) : null)}
              className="input-base py-2 px-3 text-xs max-w-sm"
            >
              {peers.map(peer => (
                <option key={peer.id} value={peer.id}>{peer.name} ({peer.ticker})</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleDownloadComparisonReport}
              disabled={!comparisonPeer}
              className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download Comparison Report
            </button>
          </div>
          {comparisonPeer && comparisonPeer.latest_score && company.latest_score && (
            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <div className="font-semibold text-slate-900 mb-2">Quick comparison</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div><span className="font-semibold">ESG delta:</span> {fmt1(company.latest_score.current_esg_score - comparisonPeer.latest_score.current_esg_score)}</div>
                <div><span className="font-semibold">Momentum delta:</span> {fmt1(company.latest_score.momentum_score - comparisonPeer.latest_score.momentum_score)}</div>
                <div><span className="font-semibold">AI delta:</span> {fmt1(company.latest_score.ai_adoption_score - comparisonPeer.latest_score.ai_adoption_score)}</div>
                <div><span className="font-semibold">Risk delta:</span> {fmt1(company.latest_score.controversy_risk - comparisonPeer.latest_score.controversy_risk)}</div>
              </div>
            </div>
          )}
          <PeerBenchmarkTable
            companies={comparisonPeer ? [company, comparisonPeer, ...peers.filter(peer => peer.id !== comparisonPeer.id)] : [company, ...peers]}
            highlight={company.id}
          />
        </div>
      )}

      {/* Evidence drawer */}
      {showEvidence && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setShowEvidence(false)} />
          <EvidenceDrawer
              evidences={visibleEvidence}
            onClose={() => setShowEvidence(false)}
            title={`Evidence — ${company.name}`}
          />
        </>
      )}
    </div>
  )
}

function ClassificationExplanation({ score }: { score: ScoreSnapshot }) {
  const reasons: string[] = []

  if (score.current_esg_score >= 60) reasons.push(`ESG score of ${fmt0(score.current_esg_score)} is above the 60-point threshold`)
  else reasons.push(`ESG score of ${fmt0(score.current_esg_score)} is below the 60-point threshold`)

  if (score.momentum_score > 20) reasons.push(`positive momentum of +${fmt1(score.momentum_score)} indicates strong ESG improvement trajectory`)
  else if (score.momentum_score < -20) reasons.push(`negative momentum of ${fmt1(score.momentum_score)} indicates deteriorating ESG performance`)
  else reasons.push(`stable momentum of ${fmt1(score.momentum_score)} indicates no significant directional change`)

  if (score.controversy_risk > 75) reasons.push(`controversy risk of ${fmt0(score.controversy_risk)}/100 exceeds the 75-point Risk Alert threshold — investor signal overridden`)

  return (
    <div className="card p-4 border-l-4 border-l-blue-400 flex items-start gap-3">
      <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
      <div>
        <div className="section-label mb-1">Why <strong>{score.classification}</strong>?</div>
        <p className="text-sm text-slate-700 leading-relaxed">
          This company is classified as <strong>{score.classification}</strong> because {reasons.join(', ')}.
          Confidence level is <span className={confidenceColor(score.confidence_score)}>{confidenceLabel(score.confidence_score)}</span> ({Math.round(score.confidence_score * 100)}%).
          Last scored: {formatDate(score.created_at)}.
        </p>
      </div>
    </div>
  )
}

function EvidenceRow({ evidence: ev }: { evidence: Evidence }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="border-b border-slate-50 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3.5 flex items-start gap-3 hover:bg-slate-50 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-700">{ev.source_name ?? ev.source_type}</span>
            {ev.source_date && <span className="text-[10px] text-slate-400">{formatDate(ev.source_date)}</span>}
            {ev.page_number && <span className="text-[10px] text-slate-400">p.{ev.page_number}</span>}
            <span className={clsx('text-[10px] font-semibold', confidenceColor(ev.confidence_score))}>
              {confidenceLabel(ev.confidence_score)}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{ev.evidence_text}</p>
        </div>
        <ChevronRight className={clsx('w-4 h-4 text-slate-300 shrink-0 mt-1 transition-transform', expanded && 'rotate-90')} />
      </button>
      {expanded && (
        <div className="px-5 pb-4">
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <p className="text-xs text-slate-700 leading-relaxed">"{ev.evidence_text}"</p>
            {ev.url && (
              <a href={ev.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-[10px] text-blue-600 hover:underline">
                <ExternalLink className="w-3 h-3" />View source
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-20 flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 text-sm">Loading company intelligence...</p>
    </div>
  )
}

function ErrorScreen({ message, onBack }: { message: string; onBack: () => void }) {
  return (
    <div className="max-w-screen-xl mx-auto px-6 py-20 flex flex-col items-center gap-4">
      <AlertTriangle className="w-10 h-10 text-amber-500" />
      <p className="text-slate-700 font-medium">{message}</p>
      <button onClick={onBack} className="btn-secondary">← Back to Dashboard</button>
    </div>
  )
}
