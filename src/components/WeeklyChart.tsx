'use client'

interface DayBar {
  label: string
  xp: number
  maxXp: number
  isToday: boolean
}

export default function WeeklyChart({ days }: { days: DayBar[] }) {
  const maxVal = Math.max(...days.map((d) => d.maxXp), 1)

  return (
    <div className="flex items-end gap-3 h-32">
      {days.map((d, i) => {
        const earnedH = d.maxXp > 0 ? Math.round((d.xp / maxVal) * 100) : 0
        const maxH = d.maxXp > 0 ? Math.round((d.maxXp / maxVal) * 100) : 0
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <div className="relative w-full flex flex-col justify-end" style={{ height: '100px' }}>
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t"
                style={{ height: `${maxH}%`, background: 'var(--border)' }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 rounded-t transition-all duration-500"
                style={{
                  height: `${earnedH}%`,
                  background: d.isToday
                    ? 'linear-gradient(180deg, var(--accent-gold), var(--accent-purple))'
                    : 'var(--accent-purple)',
                }}
              />
            </div>
            <span
              className="text-xs"
              style={{ color: d.isToday ? 'var(--accent-gold)' : 'var(--text-secondary)' }}
            >
              {d.label}
            </span>
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
              {d.xp}
            </span>
          </div>
        )
      })}
    </div>
  )
}
