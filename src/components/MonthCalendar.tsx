'use client'

interface DayScore {
  date: string
  xp: number
  maxXp: number
  winDay: boolean
}

function getDayStatus(score: DayScore | undefined): 'win' | 'partial' | 'miss' | 'future' {
  if (!score) return 'future'
  if (score.winDay) return 'win'
  if (score.xp > 0) return 'partial'
  return 'miss'
}

const statusColors = {
  win: 'var(--accent-gold)',
  partial: 'var(--accent-purple)',
  miss: 'var(--accent-red)',
  future: 'var(--border)',
}

export default function MonthCalendar({
  scores,
  year,
  month,
}: {
  scores: DayScore[]
  year: number
  month: number
}) {
  const scoreMap = new Map(scores.map((s) => [s.date, s]))
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map((d) => (
          <div key={d} className="text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isFuture = dateStr > today
          const score = scoreMap.get(dateStr)
          const status = isFuture ? 'future' : getDayStatus(score)
          return (
            <div
              key={dateStr}
              title={`${dateStr}: ${score?.xp ?? 0} XP`}
              className="aspect-square rounded flex items-center justify-center text-xs font-medium"
              style={{
                background: `${statusColors[status]}33`,
                border: `1px solid ${statusColors[status]}`,
                color: status === 'future' ? 'var(--text-secondary)' : 'var(--text-primary)',
                opacity: isFuture ? 0.3 : 1,
              }}
            >
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex gap-3 mt-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>
          <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: statusColors.win }} />
          ניצחון
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: statusColors.partial }} />
          חלקי
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: statusColors.miss }} />
          החמצה
        </span>
      </div>
    </div>
  )
}
