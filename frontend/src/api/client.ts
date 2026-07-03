import axios from 'axios'
import type {
  Company, ScoreSnapshot, Evidence, Signal, Report,
  DashboardData, MatrixData, CopilotResponse, StockData, StockRange,
} from '../types'

const BASE = '/api'

const http = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

type CompanySearchParams = {
  q?: string
  exchange?: string
  industry?: string
  country?: string
}

// ─── Companies ────────────────────────────────────────────────────────────────

export const searchCompanies = (query?: string | CompanySearchParams) => {
  const params = typeof query === 'string'
    ? (query ? { q: query } : {})
    : (query ?? {})
  return http.get<Company[]>('/companies', { params }).then(r => r.data)
}

export const getCompany = (id: number) =>
  http.get<Company>(`/companies/${id}`).then(r => r.data)

export const createCompany = (payload: Partial<Company>) =>
  http.post<Company>('/companies', payload).then(r => r.data)

// ─── Reports ─────────────────────────────────────────────────────────────────

export const uploadReport = (companyId: number, file: File, year?: number) => {
  const form = new FormData()
  form.append('file', file)
  return axios.post<Report>(
    `${BASE}/companies/${companyId}/upload-report`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: year ? { year } : {},
    }
  ).then(r => r.data)
}

// ─── Scores ───────────────────────────────────────────────────────────────────

export const getScoreHistory = (companyId: number) =>
  http.get<ScoreSnapshot[]>(`/companies/${companyId}/scores`).then(r => r.data)

export const calculateScores = (companyId: number) =>
  http.post<ScoreSnapshot>(`/companies/${companyId}/calculate-scores`).then(r => r.data)

// ─── Evidence ─────────────────────────────────────────────────────────────────

export const getEvidence = (companyId: number, category?: string, reportId?: number) =>
  http.get<Evidence[]>(`/companies/${companyId}/evidence`, {
    params: { ...(category ? { category } : {}), ...(reportId ? { report_id: reportId } : {}) },
  }).then(r => r.data)

export const getCompanyReports = (companyId: number) =>
  http.get<Report[]>(`/companies/${companyId}/reports`).then(r => r.data)

export const getStockData = (companyId: number, range: StockRange) =>
  http.get<StockData>(`/companies/${companyId}/stock-data`, {
    params: { range },
  }).then(r => r.data)

// ─── Signals ─────────────────────────────────────────────────────────────────

export const scanSignals = (companyId: number) =>
  http.post(`/companies/${companyId}/scan-signals`).then(r => r.data)

// ─── Copilot ─────────────────────────────────────────────────────────────────

export const askCopilot = (companyId: number, question: string) =>
  http.post<CopilotResponse>(`/companies/${companyId}/copilot`, { question }).then(r => r.data)

// ─── Dashboard & Matrix ───────────────────────────────────────────────────────

export const getDashboard = () =>
  http.get<DashboardData>('/dashboard').then(r => r.data)

export const getMatrix = () =>
  http.get<MatrixData>('/matrix').then(r => r.data)
