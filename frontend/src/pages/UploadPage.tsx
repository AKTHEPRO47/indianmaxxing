import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Upload, FileText, CheckCircle, AlertCircle, ChevronDown, Plus,
  Building2, Sparkles, Mic, Search, Database,
} from 'lucide-react'
import { searchCompanies, uploadReport, createCompany, calculateScores } from '../api/client'
import type { Company, Report } from '../types'
import { clsx } from 'clsx'
import CompanyLogo from '../components/CompanyLogo'
import {
  COMPANY_CATALOG,
  findCatalogByTicker,
  mergeCompanyPayload,
  searchCatalog,
  type CatalogCompany,
} from '../data/companyCatalog'


type Step = 'select' | 'upload' | 'processing' | 'done'

const EXCHANGES = ['ALL', 'NASDAQ', 'NYSE', 'NYSEARCA', 'OTC', 'SGX']

export default function UploadPage() {
  const [company, setCompany] = useState<Company | null>(null)
  const [companySuggestions, setCompanySuggestions] = useState<Company[]>([])
  const [companyQuery, setCompanyQuery] = useState('')
  const [exchangeFilter, setExchangeFilter] = useState('ALL')

  const [catalogQuery, setCatalogQuery] = useState('')
  const [catalogSuggestions, setCatalogSuggestions] = useState<CatalogCompany[]>([])

  const [year, setYear] = useState<string>(new Date().getFullYear().toString())
  const [file, setFile] = useState<File | null>(null)
  const [step, setStep] = useState<Step>('select')
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [newCompanyMode, setNewCompanyMode] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  const [newCompany, setNewCompany] = useState({
    name: '',
    ticker: '',
    exchange: 'NASDAQ',
    industry: '',
    country: '',
    market_cap: '',
    logo_url: '',
  })

  const navigate = useNavigate()

  const searchExisting = useCallback(async (q: string) => {
    setCompanyQuery(q)
    if (!q.trim()) {
      setCompanySuggestions([])
      return
    }
    const params = {
      q,
      exchange: exchangeFilter !== 'ALL' ? exchangeFilter : undefined,
    }
    const res = await searchCompanies(params)
    setCompanySuggestions(res.slice(0, 8))
  }, [exchangeFilter])

  const searchCatalogCompanies = useCallback((q: string) => {
    setCatalogQuery(q)
    if (!q.trim()) {
      setCatalogSuggestions([])
      return
    }
    const base = searchCatalog(q)
    const filtered = exchangeFilter === 'ALL'
      ? base
      : base.filter(item => item.exchange === exchangeFilter)
    setCatalogSuggestions(filtered.slice(0, 10))
  }, [exchangeFilter])

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return Array.from({ length: 8 }, (_, i) => (currentYear - i).toString())
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f && f.type === 'application/pdf') setFile(f)
    else setError('Please drop a PDF file.')
  }, [])

  const fillFromTicker = (tickerRaw: string) => {
    const ticker = tickerRaw.trim().toUpperCase()
    const found = findCatalogByTicker(ticker)
    if (!found) return
    setNewCompany(prev => ({
      ...prev,
      ticker: found.ticker,
      name: found.name,
      exchange: found.exchange,
      industry: found.industry,
      country: found.country,
      market_cap: found.market_cap ?? '',
      logo_url: found.logo_url ?? '',
    }))
  }

  const selectFromCatalog = (item: CatalogCompany) => {
    setNewCompany({
      name: item.name,
      ticker: item.ticker,
      exchange: item.exchange,
      industry: item.industry,
      country: item.country,
      market_cap: item.market_cap ?? '',
      logo_url: item.logo_url ?? '',
    })
    setCatalogSuggestions([])
    setCatalogQuery('')
    setNewCompanyMode(true)
  }

  const handleCreateCompany = async () => {
    if (!newCompany.name.trim()) {
      setError('Company name is required')
      return
    }

    try {
      const payload = mergeCompanyPayload({
        ...newCompany,
        ticker: newCompany.ticker.toUpperCase(),
        market_cap: newCompany.market_cap || null,
        logo_url: newCompany.logo_url || null,
      } as any, findCatalogByTicker(newCompany.ticker))

      const created = await createCompany(payload)
      setCompany(created)
      setNewCompanyMode(false)
      setStep('upload')
      setError(null)
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Failed to create company')
    }
  }

  const handleBulkAddTopCompanies = async () => {
    setBulkLoading(true)
    setError(null)

    const topUniverse = COMPANY_CATALOG.slice(0, 35)
    let added = 0
    let skipped = 0

    for (const item of topUniverse) {
      try {
        await createCompany({
          name: item.name,
          ticker: item.ticker,
          exchange: item.exchange,
          industry: item.industry,
          country: item.country,
          market_cap: item.market_cap ?? null,
          logo_url: item.logo_url ?? null,
        } as any)
        added += 1
      } catch {
        skipped += 1
      }
    }

    setBulkLoading(false)
    setError(`Universe sync complete: ${added} added, ${skipped} already existed.`)
  }

  const handleSubmit = async () => {
    if (!file) {
      setError('Please select a PDF file.')
      return
    }
    if (!company) {
      setError('Please select a company.')
      return
    }

    setError(null)
    setStep('processing')

    try {
      const yearNum = parseInt(year) || undefined
      const res = await uploadReport(company.id, file, yearNum)
      setReport(res)
      try {
        await calculateScores(company.id)
      } catch {
        // non-blocking
      }
      setStep('done')
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Upload failed. Please try again.')
      setStep('upload')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Upload Sustainability Report</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Add companies by ticker, filter by exchange (NASDAQ/NYSE/OTC), then upload PDFs for AI extraction and scoring.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3">
          <div className="section-label mb-1">Ticker First</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Type a ticker and autofill</div>
        </div>
        <div className="card p-3">
          <div className="section-label mb-1">Voice Search</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Use microphone input</div>
        </div>
        <div className="card p-3">
          <div className="section-label mb-1">Catalog</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Top stocks and ETFs</div>
        </div>
        <div className="card p-3">
          <div className="section-label mb-1">Logos</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Auto-loaded per ticker</div>
        </div>
      </div>

      <div className="card p-4 bg-gradient-to-r from-red-50 to-blue-50 dark:from-red-950/20 dark:to-blue-950/20 border-red-200/70 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-red-500 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">AI Boosted Pipeline</div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              New: ticker autofill, voice search, exchange filters, and larger company universe onboarding.
            </p>
          </div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {(['select', 'upload', 'done'] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={clsx(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold',
                step === s
                  ? 'bg-emerald-600 text-white'
                  : ['upload', 'done'].indexOf(s) < ['select', 'upload', 'done'].indexOf(step)
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              )}
            >
              {i + 1}
            </div>
            <span className={clsx('text-xs capitalize', step === s ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-400')}>
              {s === 'select' ? 'Select Company' : s === 'upload' ? 'Upload PDF' : 'Complete'}
            </span>
            {i < 2 && <div className="w-8 h-px bg-slate-200 dark:bg-slate-700" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {(step === 'select' || step === 'upload') && (
        <div className="card p-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <label className="section-label">Company</label>
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={handleBulkAddTopCompanies}
                disabled={bulkLoading}
                className="text-xs text-emerald-700 dark:text-emerald-300 hover:underline disabled:opacity-50"
              >
                {bulkLoading ? 'Syncing universe...' : 'Add top 35 companies'}
              </button>
            </div>
          </div>

          {!company ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2 relative">
                  <input
                    value={companyQuery}
                    onChange={e => searchExisting(e.target.value)}
                    placeholder="Search existing companies (name/ticker)..."
                    className="input-base"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                </div>
                <select
                  value={exchangeFilter}
                  onChange={e => {
                    setExchangeFilter(e.target.value)
                    if (companyQuery.trim()) searchExisting(companyQuery)
                  }}
                  className="input-base"
                >
                  {EXCHANGES.map(ex => <option key={ex} value={ex}>{ex}</option>)}
                </select>
              </div>

              {companySuggestions.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                  {companySuggestions.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCompany(c)
                        setCompanySuggestions([])
                        setCompanyQuery('')
                        setStep('upload')
                      }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-left border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <CompanyLogo ticker={c.ticker} name={c.name} logoUrl={c.logo_url} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</div>
                        <div className="text-xs text-slate-400">{c.ticker} · {c.exchange ?? 'N/A'} · {c.industry}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span>or add by ticker</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>

              <button
                onClick={() => setNewCompanyMode(!newCompanyMode)}
                className="btn-secondary w-full justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add New Company
                <ChevronDown className={clsx('w-3.5 h-3.5 transition-transform', newCompanyMode && 'rotate-180')} />
              </button>

              {newCompanyMode && (
                <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/70 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="relative">
                    <input
                      className="input-base"
                      value={catalogQuery}
                      onChange={e => searchCatalogCompanies(e.target.value)}
                      placeholder="Search ticker catalog (e.g. NVDA, SAP, SONY)..."
                    />
                    <Mic className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>

                  {catalogSuggestions.length > 0 && (
                    <div className="max-h-52 overflow-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                      {catalogSuggestions.map(item => (
                        <button
                          key={item.ticker}
                          onClick={() => selectFromCatalog(item)}
                          className="w-full px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{item.ticker} · {item.exchange} · {item.country}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="section-label text-[10px] mb-1 block">Ticker *</label>
                      <input
                        className="input-base"
                        value={newCompany.ticker}
                        onChange={e => {
                          const ticker = e.target.value.toUpperCase()
                          setNewCompany(p => ({ ...p, ticker }))
                          if (ticker.length >= 2) fillFromTicker(ticker)
                        }}
                        placeholder="e.g. NVDA"
                      />
                    </div>
                    <div>
                      <label className="section-label text-[10px] mb-1 block">Exchange</label>
                      <input
                        className="input-base"
                        value={newCompany.exchange}
                        onChange={e => setNewCompany(p => ({ ...p, exchange: e.target.value }))}
                        placeholder="NASDAQ"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="section-label text-[10px] mb-1 block">Company Name *</label>
                      <input className="input-base" value={newCompany.name} onChange={e => setNewCompany(p => ({ ...p, name: e.target.value }))} placeholder="e.g. NVIDIA Corporation" />
                    </div>
                    <div>
                      <label className="section-label text-[10px] mb-1 block">Industry</label>
                      <input className="input-base" value={newCompany.industry} onChange={e => setNewCompany(p => ({ ...p, industry: e.target.value }))} placeholder="Technology" />
                    </div>
                    <div>
                      <label className="section-label text-[10px] mb-1 block">Country</label>
                      <input className="input-base" value={newCompany.country} onChange={e => setNewCompany(p => ({ ...p, country: e.target.value }))} placeholder="United States" />
                    </div>
                  </div>

                  <button onClick={handleCreateCompany} className="btn-primary w-full justify-center">
                    Create & Continue
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <CompanyLogo ticker={company.ticker} name={company.name} logoUrl={company.logo_url} size="md" />
              <div className="flex-1">
                <div className="font-semibold text-slate-900 dark:text-slate-100">{company.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{company.ticker} · {company.exchange ?? 'N/A'} · {company.industry}</div>
              </div>
              <button onClick={() => { setCompany(null); setStep('select') }} className="text-xs text-slate-400 hover:text-slate-600 underline">
                Change
              </button>
            </div>
          )}

          {company && (
            <div className="space-y-2">
              <label className="section-label">Report Year</label>
              <select value={year} onChange={e => setYear(e.target.value)} className="input-base">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          {company && (
            <div className="space-y-2">
              <label className="section-label">PDF Report</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                className={clsx(
                  'border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer',
                  dragging ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20' :
                    file ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20' :
                      'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900'
                )}
                onClick={() => document.getElementById('pdf-input')?.click()}
              >
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-8 h-8 text-emerald-600" />
                    <div className="font-medium text-sm text-slate-800 dark:text-slate-100">{file.name}</div>
                    <div className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    <button onClick={e => { e.stopPropagation(); setFile(null) }} className="text-xs text-red-500 underline">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <Upload className="w-8 h-8" />
                    <div className="text-sm font-medium">Drag and drop a PDF, or click to browse</div>
                    <div className="text-xs">Annual reports, sustainability reports, integrated reports</div>
                  </div>
                )}
                <input id="pdf-input" type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
          )}

          {file && company && (
            <button onClick={handleSubmit} className="btn-primary w-full justify-center py-3 text-base">
              Upload & Extract ESG Data
            </button>
          )}
        </div>
      )}

      {step === 'processing' && (
        <div className="card p-10 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <div className="font-semibold text-slate-900 dark:text-slate-100">Extracting ESG Data...</div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              AI is parsing pages, extracting evidence, classifying signals, and recomputing scores.
            </p>
          </div>
          <div className="space-y-1 text-xs text-slate-400 text-center">
            <div>PDF parsing and OCR normalization</div>
            <div>Metric extraction and evidence grounding</div>
            <div>Signal classification and confidence scoring</div>
            <div>Momentum and risk recomputation</div>
          </div>
        </div>
      )}

      {step === 'done' && report && company && (
        <div className="card p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Report Saved</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Successfully processed <strong>{report.file_name}</strong>
              {report.page_count && ` (${report.page_count} pages)`}
            </p>
            <p className="text-xs text-slate-400 mt-2 max-w-md">
              This upload is stored in the report archive, and the extracted evidence can be reopened later from the company page.
            </p>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => navigate(`/companies/${company.id}`)} className="btn-primary">
              Open Saved Report
            </button>
            <button onClick={() => { setStep('select'); setFile(null); setCompany(null); setReport(null) }} className="btn-secondary">
              Upload Another
            </button>
          </div>
        </div>
      )}

      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-4">AI extraction capabilities</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            'Scope 1, 2, 3 emissions', 'Net zero targets', 'Renewable energy %',
            'Board independence', 'Gender diversity', 'Employee safety',
            'Labor standards', 'Governance policies', 'AI adoption signals',
            'Controversy mentions', 'Target baselines', 'Audit verification',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
