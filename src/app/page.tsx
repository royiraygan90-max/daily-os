import { prisma } from '@/lib/prisma'
import { getTodayIST, getDayOfYear, getLevel, getLevelName, xpToNextLevel } from '@/lib/utils'
import HabitCard from '@/components/HabitCard'
import DailyScoreRing from '@/components/DailyScoreRing'
import StreakBadge from '@/components/StreakBadge'
import MorningBriefClient from '@/components/MorningBriefClient'

export const dynamic = 'force-dynamic'

async function getData() {
  const today = getTodayIST()

  const [habits, tasks, score, quotes, goals, allScores] = await Promise.all([
    prisma.habit.findMany({
      orderBy: { order: 'asc' },
      include: { completions: { where: { date: today } } },
    }),
    prisma.task.findMany({ where: { date: today } }),
    prisma.dailyScore.findUnique({ where: { date: today } }),
    prisma.quote.findMany({ orderBy: { id: 'asc' } }),
    prisma.goal.findMany({ where: { isPinned: true }, take: 1 }),
    prisma.dailyScore.findMany({ orderBy: { date: 'desc' } }),
  ])

  const quote = quotes.length > 0 ? quotes[getDayOfYear() % quotes.length] : null
  const pinnedGoal = goals[0] || null

  let streak = 0
  const checkDate = new Date(today)
  for (const s of allScores) {
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

  const totalXp = allScores.reduce((s, d) => s + d.xp, 0)
  const thisMonthPrefix = today.slice(0, 7)
  const thisMonthDays = allScores.filter((d) => d.date.startsWith(thisMonthPrefix))
  const thisMonthWins = thisMonthDays.filter((d) => d.winDay).length
  const winRateMonth = thisMonthDays.length > 0 ? Math.round((thisMonthWins / thisMonthDays.length) * 100) : 0

  const habitsWithStatus = habits.map((h) => ({
    id: h.id,
    name: h.name,
    icon: h.icon,
    xpValue: h.xpValue,
    completedToday: h.completions.length > 0,
  }))

  const tasksToday = tasks.length
  const tasksDone = tasks.filter((t) => t.completed).length

  return {
    habitsWithStatus,
    tasksToday,
    tasksDone,
    score: score || { xp: 0, maxXp: 0, winDay: false },
    quote,
    pinnedGoal,
    streak,
    totalXp,
    level: getLevel(totalXp),
    levelName: getLevelName(getLevel(totalXp)),
    xpProgress: xpToNextLevel(totalXp),
    winRateMonth,
  }
}

export default async function MorningBriefPage() {
  const data = await getData()
  const habitsDone = data.habitsWithStatus.filter((h) => h.completedToday).length
  const habitsTotal = data.habitsWithStatus.length

  const dateStr = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Greeting card */}
      <div
        className="card p-6 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(245,158,11,0.05))',
          borderColor: 'rgba(124,58,237,0.3)',
        }}
      >
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          בוקר טוב, רועי ⚡
        </h1>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {dateStr}
        </p>
        {data.quote && (
          <blockquote className="border-l-2 pl-4 my-3" style={{ borderColor: 'var(--accent-purple)' }}>
            <p className="italic text-sm" style={{ color: 'var(--text-primary)' }}>
              &ldquo;{data.quote.text}&rdquo;
            </p>
            <footer className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              — {data.quote.author}
            </footer>
          </blockquote>
        )}
        {data.pinnedGoal && (
          <div
            className="mt-4 p-3 rounded-lg"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>
              🎯 המטרה שלך: {data.pinnedGoal.text}
            </p>
          </div>
        )}
      </div>

      {/* Today's Battle */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ⚔️ קרב היום
          </h2>
          <DailyScoreRing done={habitsDone} total={habitsTotal} size={64} />
        </div>

        <MorningBriefClient habits={data.habitsWithStatus} />

        <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span>✅</span>
          <span>
            {data.tasksDone}/{data.tasksToday} משימות היום הושלמו
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StreakBadge streak={data.streak} />
        <StatCard icon="⚡" value={`${data.score.xp}`} label="XP היום" color="var(--accent-gold)" />
        <StatCard
          icon="🏆"
          value={`Lv.${data.level}`}
          label={data.levelName}
          color="var(--accent-purple)"
        />
        <StatCard
          icon="📅"
          value={`${data.winRateMonth}%`}
          label="אחוז ניצחון החודש"
          color="var(--accent-green)"
        />
      </div>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string
  value: string
  label: string
  color: string
}) {
  return (
    <div className="card p-4 flex flex-col items-center text-center gap-1">
      <span className="text-2xl">{icon}</span>
      <span className="text-xl font-bold" style={{ color }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  )
}
