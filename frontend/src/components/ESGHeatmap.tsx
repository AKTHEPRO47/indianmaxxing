import { useMemo } from 'react'
import { format, startOfWeek, addDays, subWeeks } from 'date-fns'
import type { ScoreSnapshot } from '../types'
import { clsx } from 'clsx'

interface Props {
  scores: ScoreSnapshot[]
  weeks?: number
}

function scoreColor(score: number | null): string {
  if (score == null) return 'bg-slate-100'
  if (score >= 80) return 'bg-emerald-600'
  if (score >= 65) return 'bg-emerald-400'
  if (score >= 50) return 'bg-yellow-400'
  if (score >= 35) return 'bg-orange-400'
  return 'bg-red-500'
}

function scoreOpacity(score: number | null): string {
  if (score == null) return 'opacity-20'
  if (score >= 80) return 'opacity-90'
  if (score >= 65) return 'opacity-75'
  if (score >= 50) return 'opacity-60'
  if (score >= 35) return 'opacity-70'
  return 'opacity-80'
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function ESGHeatmap({ scores, weeks = 16 }: Props) {
  const cells = useMemo(() => {
    // Build a map of ISO date → ESG score
    const dateMap = new Map<string, number>()
    for (const s of scores) {
      if (!s.created_at) continue
      const key = format(new Date(s.created_at), 'yyyy-MM-dd')
      // Keep the most recent if multiple on same day
      const existing = dateMap.get(key)
      if (existing == null || s.current_esg_score > existing) {
        dateMap.set(key, s.current_esg_score)
      }
    }

    // Build weeks grid: oldest first
    const grid: Array<{ weekStart: Date; days: Array<{ date: Date; score: number | null }> }> = []
    const today = new Date()
    const latestMonday = startOfWeek(today, { weekStartsOn: 1 })

    for (let w = weeks - 1; w >= 0; w--) {
      const weekStart = subWeeks(latestMonday, w)
      const days = Array.from({ length: 7 }, (_, d) => {
        const date = addDays(weekStart, d)
        const key = format(date, 'yyyy-MM-dd')
        return { date, score: dateMap.get(key) ?? null }
      })
      grid.push({ weekStart, days })
    }
    return grid
  }, [scores, weeks])

  const latestScore = scores.length > 0 ? scores[scores.length - 1]?.current_esg_score : null

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="section-label mb-1">ESG Activity</div>
          <h2 className="font-semibold text-slate-900 text-sm">Score history heatmap</h2>
          <p className="text-xs text-slate-400">Weekly ESG score distribution over {weeks} weeks</p>
        </div>
        {latestScore != null && (
          <div className="text-right">
            <div className="text-lg font-bold text-slate-900">{latestScore.toFixed(1)}</div>
            <div className="text-[10px] text-slate-400">Latest ESG</div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-0">
          {/* Day labels */}
          <div className="flex flex-col gap-1 mr-1">
            <div className="h-4" /> {/* spacer for month labels row */}
            {DAYS.map(d => (
              <div key={d} className="h-4 flex items-center text-[10px] text-slate-400 w-7">{d}</div>
            ))}
          </div>

          {/* Week columns */}
          {cells.map(({ weekStart, days }, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              <div className="h-4 text-[10px] text-slate-400 leading-none">
                {days[0].date.getDate() <= 7 ? format(days[0].date, 'MMM') : ''}
              </div>
              {days.map(({ date, score }, di) => (
                <div
                  key={di}
                  title={`${format(date, 'MMM d, yyyy')}${score != null ? ': ESG ' + score.toFixed(1) : ': No data'}`}
                  className={clsx(
                    'h-4 w-4 rounded-sm cursor-default transition-transform hover:scale-125',
                    scoreColor(score),
                    scoreOpacity(score)
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3">
        <span className="text-[10px] text-slate-400">Less</span>
        {[null, 20, 40, 60, 80].map((v, i) => (
          <div key={i} title={v != null ? String(v) : 'No data'}
            className={clsx('h-3.5 w-3.5 rounded-sm', scoreColor(v), scoreOpacity(v))} />
        ))}
        <span className="text-[10px] text-slate-400">More</span>
        <span className="ml-auto text-[10px] text-slate-400">{scores.length} snapshots recorded</span>
      </div>
    </div>
  )
}
