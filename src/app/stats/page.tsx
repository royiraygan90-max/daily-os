import { prisma } from '@/lib/prisma'
import { getTodayIST, lastNDays } from '@/lib/utils'
import { getXpProgress, getLevelName } from '@/lib/levelSystem'
import WeeklyChart from '@/components/WeeklyChart'
import MonthCalendar from '@/components/MonthCalendar'

export const dynamic = 'force-dynamic'

export default async function StatsPage() {
  const today = getTodayIST()
  const [year, monthNum] = today.split('-').map(Number)

  const allScores = await prisma.dailyScore.findMany({ orderBy: { date: 'asc' } })
  const totalXp = allScores.reduce((s, d) => s + d.xp, 0)
  const totalTasks = await prisma.task.count({ where: { completed: true } })

  let streak = 0
  const sortedDesc = [...allScores].sort((a, b) => b.date.localeCompare(a.date))
  const checkDate = new Date(today)
  for (const s of sortedDesc) {
    const expected = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(checkDate)
    if (s.date === expected && s.winDay) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (s.date === expected) {
      break
    } else {
      break
    }
  }

  const xpProgress = getXpProgress(totalXp)
  const level = xpProgress.level
  const levelName = getLevelName(level)

  const week7 = lastNDays(7)
  const scoreMap = new Map(allScores.map((s) => [s.date, s]))
  const weeklyBars = week7.map((date) => {
    const score = scoreMap.get(date)
    const d = new Date(date + 'T00:00:00')
    const label = new Intl.DateTimeFormat('he-IL', { weekday: 'short' }).format(d)
    return {
      label,
      xp: score?.xp ?? 0,
      maxXp: score?.maxXp ?? 0,
      isToday: date === today,
    }
  })

  const monthPrefix = today.slice(0, 7)
  const monthScores = allScores.filter((s) => s.date.startsWith(monthPrefix))

  const days30 = lastNDays(30)
  const habits = await prisma.habit.findMany({
    include: { completions: { where: { date: { in: days30 } } } },
    orderBy: { order: 'asc' },
  })
  const habitRates = habits.map((h) => ({
    name: h.name,
    icon: h.icon,
    rate: Math.round((h.completions.length / 30) * 100),
  }))

  const top3 = [...allScores].sort((a, b) => b.xp - a.xp).slice(0, 3)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        📊 סטטיסטיקות
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total XP', value: totalXp.toLocaleString(), icon: '⚡', color: 'var(--accent-gold)' },
          { label: 'משימות הושלמו', value: totalTasks.toString(), icon: '✅', color: 'var(--accent-green)' },
          { label: 'רצף נוכחי', value: `${streak} ימים`, icon: '🔥', color: 'var(--accent-orange)' },
          { label: 'רמה', value: `${level}`, icon: '🏆', color: 'var(--accent-purple)' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex flex-col items-center text-center gap-1">
            <span className="text-2xl">{s.icon}</span>
            <span className="text-xl font-bold" style={{ color: s.color }}>
              {s.value}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>
              🏆 {levelName} — Level {level}
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {xpProgress.currentLevelXp}/{xpProgress.xpNeededForNextLevel} XP לרמה הבאה
            </p>
          </div>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, (xpProgress.currentLevelXp / xpProgress.xpNeededForNextLevel) * 100)}%`,
              background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-gold))',
            }}
          />
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          📈 XP שבועי
        </h3>
        <WeeklyChart days={weeklyBars} />
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          📅 לוח החודש
        </h3>
        <MonthCalendar scores={monthScores} year={year} month={monthNum} />
      </div>

      <div className="card p-5">
        <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          🔥 השלמת הרגלים — 30 יום אחרונים
        </h3>
        <div className="space-y-3">
          {habitRates.map((h) => (
            <div key={h.name} className="flex items-center gap-3">
              <span className="text-lg w-6 shrink-0">{h.icon}</span>
              <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>
                {h.name}
              </span>
              <div className="w-32 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${h.rate}%`,
                    background: h.rate >= 80 ? 'var(--accent-gold)' : h.rate >= 50 ? 'var(--accent-purple)' : 'var(--accent-red)',
                  }}
                />
              </div>
              <span className="text-xs w-10 text-right" style={{ color: 'var(--text-secondary)' }}>
                {h.rate}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {top3.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold mb-4" style={{ color: 'var(--accent-gold)' }}>
            🏅 Hall of Fame — 3 הימים הטובים
          </h3>
          <div className="space-y-2">
            {top3.map((d, i) => (
              <div
                key={d.date}
                className="flex items-center gap-3 px-3 py-2 rounded-lg"
                style={{ background: 'var(--bg-card-hover)' }}
              >
                <span className="text-xl">{['🥇', '🥈', '🥉'][i]}</span>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {d.date}
                </span>
                <span className="text-sm font-bold" style={{ color: 'var(--accent-gold)' }}>
                  {d.xp} XP
                </span>
                {d.winDay && (
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(16,185,129,0.2)', color: 'var(--accent-green)' }}>
                    Win Day
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
