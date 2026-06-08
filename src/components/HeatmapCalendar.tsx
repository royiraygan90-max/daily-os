'use client'

interface HeatmapDay {
  date: string
  pct: number
}

interface HeatmapCalendarProps {
  days: HeatmapDay[]
}

function getColor(pct: number): string {
  if (pct === 0) return '#1a1a26'
  if (pct < 0.5) return 'rgba(124,58,237,0.3)'
  if (pct < 0.8) return 'rgba(124,58,237,0.7)'
  return 'var(--accent-gold)'
}

export default function HeatmapCalendar({ days }: HeatmapCalendarProps) {
  return (
    <div className="overflow-x-auto">
      <div className="flex flex-wrap gap-1 min-w-[280px]">
        {days.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${Math.round(d.pct * 100)}%`}
            className="w-3 h-3 rounded-sm"
            style={{ background: getColor(d.pct) }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>פחות</span>
        {[0, 0.3, 0.65, 1].map((v) => (
          <div key={v} className="w-3 h-3 rounded-sm" style={{ background: getColor(v) }} />
        ))}
        <span>יותר</span>
      </div>
    </div>
  )
}
