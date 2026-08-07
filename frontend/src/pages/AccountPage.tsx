import { useEffect, useMemo, useState } from 'react'
import { Download, Upload, Trash2, Pencil, Save, Settings2, ShieldCheck, UserRound, Bell, CheckCheck, Circle, Globe2 } from 'lucide-react'
import { addFavoriteItem, addWatchlistItem, deleteReport, exportAccount, getAccountReports, getFavorites, getNotifications, getProfile, getWatchlist, importAccount, markAllNotificationsRead, markNotificationRead, removeFavoriteItem, removeWatchlistItem, renameReport, updatePreferences, updateProfile } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Company, NotificationItem, NotificationPreferences, Report, UserProfile } from '../types'
import { countryFlagEmoji } from '../utils/flags'

export default function AccountPage() {
  const { user: authUser, refreshUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [watchlist, setWatchlist] = useState<Company[]>([])
  const [favorites, setFavorites] = useState<Company[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingReportId, setEditingReportId] = useState<number | null>(null)
  const [reportName, setReportName] = useState('')
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null)

  const accentPalette: Record<UserProfile['accent_color'], string> = {
    slate: '#0f172a',
    rose: '#be123c',
    emerald: '#059669',
    blue: '#2563eb',
    violet: '#7c3aed',
    amber: '#d97706',
  }

  const notificationPreferences: NotificationPreferences = profile?.notification_preferences ?? {
    enabled: true,
    live_price_alerts: true,
    price_move_threshold_pct: 2.5,
    market_open_countries: ['Singapore', 'United States', 'Hong Kong'],
  }

  useEffect(() => {
    const load = async () => {
      setError(null)
      const results = await Promise.allSettled([
        getProfile(),
        getWatchlist(),
        getFavorites(),
        getAccountReports(),
        getNotifications(),
      ])

      const [profileResult, watchlistResult, favoritesResult, reportsResult, notificationsResult] = results

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value)
      } else if (authUser) {
        setProfile(authUser)
      } else {
        setProfile(null)
      }

      if (watchlistResult.status === 'fulfilled') setWatchlist(watchlistResult.value)
      if (favoritesResult.status === 'fulfilled') setFavorites(favoritesResult.value)
      if (reportsResult.status === 'fulfilled') setReports(reportsResult.value)
      if (notificationsResult.status === 'fulfilled') setNotifications(notificationsResult.value)

      const fatal = profileResult.status === 'rejected' && !authUser
      if (fatal) {
        const reason = profileResult.reason as any
        setError(reason?.response?.data?.detail ?? 'Unable to load account data')
      }
    }
    load()
  }, [authUser?.id])

  const handleSaveProfile = async () => {
    if (!profile) return
    setStatus(null)
    setError(null)
    try {
      const updated = await updateProfile({
        email: profile.email,
        full_name: profile.full_name,
        investing_style: profile.investing_style,
      })
      setProfile(updated)
      await refreshUser()
      setStatus('Profile updated')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to update profile')
    }
  }

  const handleSavePreferences = async () => {
    if (!profile) return
    setStatus(null)
    setError(null)
    try {
      const updated = await updatePreferences({
        theme_mode: profile.theme_mode,
        accent_color: profile.accent_color,
        dashboard_layout: profile.dashboard_layout,
        card_density: profile.card_density,
        ui_preferences: profile.ui_preferences,
        notification_preferences: notificationPreferences,
      })
      setProfile(updated)
      await refreshUser()
      setStatus('Preferences saved')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to update preferences')
    }
  }

  const handleExport = async () => {
    const data = await exportAccount()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'tricard-account-export.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (file: File) => {
    setStatus(null)
    setError(null)
    try {
      await importAccount(file, false)
      setPendingImportFile(file)
      setStatus('Import validated. Click confirm to overwrite existing saved data.')
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setPendingImportFile(file)
        setStatus('Import would overwrite existing data. Confirm to continue.')
        return
      }
      setError(err?.response?.data?.detail ?? 'Import failed')
    }
  }

  const handleConfirmImport = async () => {
    if (!pendingImportFile) return
    setStatus(null)
    setError(null)
    try {
      await importAccount(pendingImportFile, true)
      setPendingImportFile(null)
      setStatus('Account data imported successfully')
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Import confirmation failed')
    }
  }

  const handleOpenNotification = async (item: NotificationItem) => {
    try {
      if (!item.read_at) {
        const updated = await markNotificationRead(item.id)
        setNotifications(current => current.map(entry => entry.id === updated.id ? updated : entry))
      }
      if (item.deep_link) {
        const path = item.deep_link.replace(/^\/#/, '')
        if (path) {
          window.location.hash = path.startsWith('#') ? path : `#${path}`
        }
      }
    } catch {
      setError('Unable to open notification')
    }
  }

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsRead()
      setNotifications(current => current.map(item => item.read_at ? item : { ...item, read_at: new Date().toISOString() }))
    } catch {
      setError('Unable to mark notifications as read')
    }
  }

  const handleRenameReport = async () => {
    if (!editingReportId) return
    const updated = await renameReport(editingReportId, reportName)
    setReports(current => current.map(report => report.id === updated.id ? updated : report))
    setEditingReportId(null)
    setReportName('')
  }

  const accountSummary = useMemo(() => [
    { label: 'Watchlist items', value: watchlist.length },
    { label: 'Favorites', value: favorites.length },
    { label: 'Saved reports', value: reports.length },
  ], [watchlist.length, favorites.length, reports.length])

  const notificationCountry = (item: NotificationItem) => {
    const country = item.metadata?.country
    return typeof country === 'string' ? country : null
  }

  const notificationTime = (item: NotificationItem) => {
    if (!item.created_at) return 'Unknown time'
    const dt = new Date(item.created_at)
    if (Number.isNaN(dt.getTime())) return 'Unknown time'
    return dt.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Singapore',
      timeZoneName: 'short',
    })
  }

  const hasPreferenceChanges = Boolean(
    profile
    && authUser
    && (
      profile.theme_mode !== authUser.theme_mode
      || profile.accent_color !== authUser.accent_color
      || profile.dashboard_layout !== authUser.dashboard_layout
      || profile.card_density !== authUser.card_density
    )
  )

  useEffect(() => {
    if (!profile) return
    const root = document.documentElement
    const resolvedTheme = profile.theme_mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : profile.theme_mode

    root.dataset.tricardTheme = profile.theme_mode
    root.dataset.tricardThemeResolved = resolvedTheme
    root.dataset.tricardAccent = profile.accent_color
    root.dataset.tricardLayout = profile.dashboard_layout
    root.dataset.tricardDensity = profile.card_density
    root.style.setProperty('--tricard-accent', accentPalette[profile.accent_color])
    root.classList.toggle('dark', resolvedTheme === 'dark')
  }, [profile?.theme_mode, profile?.accent_color, profile?.dashboard_layout, profile?.card_density])

  const resetUiDefaults = () => {
    setProfile(prev => prev ? {
      ...prev,
      theme_mode: 'light',
      accent_color: 'slate',
      dashboard_layout: 'comfortable',
      card_density: 'comfortable',
    } : prev)
  }

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="card p-5 border-l-4 border-l-rose-600">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-700 via-red-600 to-blue-600 text-white">
            <UserRound className="h-5 w-5" />
          </div>
          <div>
            <div className="section-label mb-1">Account</div>
            <h1 className="text-2xl font-bold text-slate-900">Profile & personal settings</h1>
            <p className="text-sm text-slate-500">Your account data stays private and syncs across devices.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {accountSummary.map(item => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400">{item.label}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {status && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{status}</div>}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" />Profile</div>
          <label className="block text-sm">
            <span className="mb-2 block text-xs uppercase tracking-wider text-slate-500">Email</span>
            <input value={profile?.email ?? ''} onChange={e => setProfile(prev => prev ? { ...prev, email: e.target.value } : prev)} className="input-base w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-xs uppercase tracking-wider text-slate-500">Full name</span>
            <input value={profile?.full_name ?? ''} onChange={e => setProfile(prev => prev ? { ...prev, full_name: e.target.value } : prev)} className="input-base w-full" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-xs uppercase tracking-wider text-slate-500">Investing style</span>
            <input value={profile?.investing_style ?? ''} onChange={e => setProfile(prev => prev ? { ...prev, investing_style: e.target.value } : prev)} className="input-base w-full" />
          </label>
          <button onClick={handleSaveProfile} className="btn-primary text-xs"><Save className="h-4 w-4" />Save profile</button>
        </section>

        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Settings2 className="h-4 w-4 text-rose-600" />UI preferences</div>
            {hasPreferenceChanges && <span className="text-[10px] uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">Unsaved changes</span>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-2 block text-xs uppercase tracking-wider text-slate-500">Theme</span>
              <select value={profile?.theme_mode ?? 'light'} onChange={e => setProfile(prev => prev ? { ...prev, theme_mode: e.target.value as UserProfile['theme_mode'] } : prev)} className="input-base w-full">
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block text-xs uppercase tracking-wider text-slate-500">Accent</span>
              <select value={profile?.accent_color ?? 'slate'} onChange={e => setProfile(prev => prev ? { ...prev, accent_color: e.target.value as UserProfile['accent_color'] } : prev)} className="input-base w-full">
                <option value="slate">Slate</option>
                <option value="rose">Rose</option>
                <option value="emerald">Emerald</option>
                <option value="blue">Blue</option>
                <option value="violet">Violet</option>
                <option value="amber">Amber</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block text-xs uppercase tracking-wider text-slate-500">Dashboard layout</span>
              <select value={profile?.dashboard_layout ?? 'comfortable'} onChange={e => setProfile(prev => prev ? { ...prev, dashboard_layout: e.target.value as UserProfile['dashboard_layout'] } : prev)} className="input-base w-full">
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
                <option value="analytics">Analytics</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-2 block text-xs uppercase tracking-wider text-slate-500">Card density</span>
              <select value={profile?.card_density ?? 'comfortable'} onChange={e => setProfile(prev => prev ? { ...prev, card_density: e.target.value as UserProfile['card_density'] } : prev)} className="input-base w-full">
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
                <option value="dense">Dense</option>
              </select>
            </label>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="text-xs uppercase tracking-wider text-slate-500">Live preview</div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accentPalette[profile?.accent_color ?? 'slate'] }} />
                Accent: {profile?.accent_color ?? 'slate'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">Theme: {profile?.theme_mode ?? 'light'}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">Layout: {profile?.dashboard_layout ?? 'comfortable'}</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">Density: {profile?.card_density ?? 'comfortable'}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={handleSavePreferences} disabled={!hasPreferenceChanges} className="btn-primary text-xs disabled:opacity-60 disabled:cursor-not-allowed"><Save className="h-4 w-4" />Save preferences</button>
            <button onClick={resetUiDefaults} className="btn-secondary text-xs">Reset defaults</button>
          </div>
        </section>

        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Bell className="h-4 w-4 text-blue-600" />Notification settings</div>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span>Enable notifications</span>
            <input
              type="checkbox"
              checked={notificationPreferences.enabled}
              onChange={e => setProfile(prev => prev ? { ...prev, notification_preferences: { ...notificationPreferences, enabled: e.target.checked } } : prev)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
          </label>
          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <span>Live price alerts</span>
            <input
              type="checkbox"
              checked={notificationPreferences.live_price_alerts}
              onChange={e => setProfile(prev => prev ? { ...prev, notification_preferences: { ...notificationPreferences, live_price_alerts: e.target.checked } } : prev)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-xs uppercase tracking-wider text-slate-500">Price move threshold (%)</span>
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={notificationPreferences.price_move_threshold_pct}
              onChange={e => setProfile(prev => prev ? { ...prev, notification_preferences: { ...notificationPreferences, price_move_threshold_pct: Number(e.target.value) || 0 } } : prev)}
              className="input-base w-full"
            />
          </label>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-slate-500">Market open notifications</div>
            <div className="grid gap-2 sm:grid-cols-3">
              {(['Singapore', 'United States', 'Hong Kong'] as const).map(country => (
                <label key={country} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={notificationPreferences.market_open_countries.includes(country)}
                    onChange={e => setProfile(prev => prev ? {
                      ...prev,
                      notification_preferences: {
                        ...notificationPreferences,
                        market_open_countries: e.target.checked
                          ? Array.from(new Set([...notificationPreferences.market_open_countries, country]))
                          : notificationPreferences.market_open_countries.filter(item => item !== country),
                      },
                    } : prev)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  <span className="text-base" aria-hidden="true">{countryFlagEmoji(country)}</span>
                  <Globe2 className="h-4 w-4 text-slate-500" />
                  <span>{country}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="card p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Bell className="h-4 w-4 text-blue-600" />Notifications</div>
            <button onClick={handleMarkAllNotificationsRead} className="btn-secondary text-xs"><CheckCheck className="h-4 w-4" />Mark all read</button>
          </div>
          <div className="space-y-2">
            {notifications.map(notification => (
              <button
                key={notification.id}
                onClick={() => handleOpenNotification(notification)}
                className={`w-full rounded-2xl border p-3 text-left transition-colors ${notification.read_at ? 'border-slate-200 bg-white hover:bg-slate-50' : 'border-blue-200 bg-blue-50 hover:bg-blue-100'}`}
              >
                <div className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">{notificationTime(notification)}</div>
                <div className="flex items-start gap-3">
                  <Circle className={`mt-0.5 h-3 w-3 shrink-0 ${notification.read_at ? 'text-slate-300' : 'text-blue-600 fill-blue-600'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium text-slate-900 text-sm">
                      {notificationCountry(notification) && <span aria-hidden="true">{countryFlagEmoji(notificationCountry(notification))}</span>}
                      <span>{notification.title}</span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 line-clamp-2">{notification.body}</div>
                    <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">
                      {notificationCountry(notification) ? `${countryFlagEmoji(notificationCountry(notification))} ` : ''}{notification.trigger_type} · {notification.channel}
                    </div>
                  </div>
                </div>
              </button>
            ))}
            {notifications.length === 0 && <div className="text-sm text-slate-500">No notifications yet.</div>}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Pencil className="h-4 w-4 text-blue-600" />Reports</div>
          <div className="space-y-2">
            {reports.map(report => (
              <div key={report.id} className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-slate-900 text-sm">{report.file_name}</div>
                  <div className="text-xs text-slate-500">#{report.id} · {report.status} · {report.page_count ?? 0} pages</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setEditingReportId(report.id); setReportName(report.file_name) }} className="btn-secondary text-xs"><Pencil className="h-3.5 w-3.5" />Rename</button>
                  <button onClick={() => deleteReport(report.id).then(() => setReports(current => current.filter(item => item.id !== report.id)))} className="btn-secondary text-xs text-rose-700"><Trash2 className="h-3.5 w-3.5" />Delete</button>
                </div>
              </div>
            ))}
            {reports.length === 0 && <div className="text-sm text-slate-500">No saved reports yet.</div>}
          </div>

          {editingReportId && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-2 block text-xs uppercase tracking-wider text-slate-500">Report name</span>
                <input value={reportName} onChange={e => setReportName(e.target.value)} className="input-base w-full" />
              </label>
              <button onClick={handleRenameReport} className="btn-primary text-xs">Save rename</button>
            </div>
          )}
        </section>

        <section className="card p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Download className="h-4 w-4 text-emerald-600" />Data portability</div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExport} className="btn-primary text-xs"><Download className="h-4 w-4" />Export all data</button>
            <label className="btn-secondary text-xs cursor-pointer">
              <Upload className="h-4 w-4" />Import export file
              <input type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
            </label>
            {pendingImportFile && (
              <button onClick={handleConfirmImport} className="btn-secondary text-xs border-emerald-200 text-emerald-700">
                <ShieldCheck className="h-4 w-4" />Confirm overwrite
              </button>
            )}
          </div>
          <div className="text-xs text-slate-500">Imported data is validated before it can overwrite any existing account content.</div>

          <div className="space-y-2 pt-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Watchlist</div>
            <div className="flex flex-wrap gap-2">
              {watchlist.map(item => (
                <button key={item.id} onClick={() => removeWatchlistItem(item.id).then(() => setWatchlist(current => current.filter(entry => entry.id !== item.id)))} className="rounded-full bg-slate-100 px-3 py-1 text-xs hover:bg-slate-200">
                  {item.ticker} ×
                </button>
              ))}
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mt-4">Favorites</div>
            <div className="flex flex-wrap gap-2">
              {favorites.map(item => (
                <button key={item.id} onClick={() => removeFavoriteItem(item.id).then(() => setFavorites(current => current.filter(entry => entry.id !== item.id)))} className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100">
                  {item.ticker} ×
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}