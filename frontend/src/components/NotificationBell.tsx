import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../api/client'
import type { NotificationItem } from '../types'
import { countryFlagEmoji } from '../utils/flags'

export default function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationItem[]>([])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const data = await getNotifications(8)
        if (active) setItems(data)
      } catch {
        // keep last known items if polling fails
      }
    }
    load()
    const timer = setInterval(load, 30000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const unreadCount = useMemo(() => items.filter(item => !item.read_at).length, [items])

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

  const openNotification = async (item: NotificationItem) => {
    try {
      if (!item.read_at) {
        const updated = await markNotificationRead(item.id)
        setItems(current => current.map(entry => entry.id === updated.id ? updated : entry))
      }
      setOpen(false)
      if (item.deep_link) {
        const route = item.deep_link.replace(/^\/#/, '')
        if (route) navigate(route)
      }
    } catch {
      // no-op
    }
  }

  const markAllRead = async () => {
    try {
      await markAllNotificationsRead()
      setItems(current => current.map(item => item.read_at ? item : { ...item, read_at: new Date().toISOString() }))
    } catch {
      // no-op
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">Notifications</div>
              <div className="text-xs text-slate-500">Live market and report alerts</div>
            </div>
            <button onClick={markAllRead} className="btn-secondary text-[11px]"><CheckCheck className="h-3.5 w-3.5" />Mark all read</button>
          </div>

          <div className="max-h-[24rem] overflow-auto divide-y divide-slate-100">
            {items.length > 0 ? items.map(item => (
              <button
                key={item.id}
                onClick={() => openNotification(item)}
                className={`w-full px-4 py-3 text-left transition-colors ${item.read_at ? 'hover:bg-slate-50' : 'bg-blue-50/60 hover:bg-blue-100/60'}`}
              >
                <div className="text-[10px] uppercase tracking-wider text-slate-400">{notificationTime(item)}</div>
                <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                  {notificationCountry(item) && <span aria-hidden="true">{countryFlagEmoji(notificationCountry(item))}</span>}
                  <span>{item.title}</span>
                </div>
                <div className="mt-1 line-clamp-2 text-xs text-slate-500">{item.body}</div>
                <div className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">
                  {notificationCountry(item) ? `${countryFlagEmoji(notificationCountry(item))} ` : ''}{item.trigger_type.split('_').join(' ')} · {item.channel}
                </div>
              </button>
            )) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</div>
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-3 text-right">
            <Link to="/account" onClick={() => setOpen(false)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Open inbox
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}