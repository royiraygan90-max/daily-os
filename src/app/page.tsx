import { prisma } from '@/lib/prisma'
import { getTodayIST, getDayOfYear, getWeekKey, getMonthKey } from '@/lib/utils'
import { getOrCreateProfile } from '@/lib/playerProfile'
import { getXpProgress, getLevelName } from '@/lib/levelSystem'
import DailyScoreRing from '@/components/DailyScoreRing'
import StreakBadge from '@/components/StreakBadge'
import MorningBriefClient from '@/components/MorningBriefClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getData() {
  const today = getTodayIST()
  const weekKey = getWeekKey(today)
  const monthKey = getMonthKey(today)

  const [habits, tasks, score, quotes, goals, allScores, challenges, profile] = await Promise.all([
    prisma.habit.findMany({
      orderBy: { order: 'asc' },
      include: { completions: { where: { date: today } } },
    }),
    prisma.task.findMany({ where: { date: today } }),
    prisma.dailyScore.findUnique({ where: { date: today } }),
    prisma.quote.findMany({ orderBy: { id: 'asc' } }),
    prisma.goal.findMany({ where: { isPinned: true }, take: 1 }),
    prisma.dailyScore.findMany({ orderBy: { date: 'desc' } }),
    prisma.challenge.findMany({
      where: { isActive: true },
      include: { logs: { where: { OR: [{ weekKey }, { monthKey }] } } },
      orderBy: { id: 'asc' },
    }),
    getOrCreateProfile(),
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

  const thisMonthPrefix = today.slice(0, 7)
  const thisMonthDays = allScores.filter((d) => d.date.startsWith(thisMonthPrefix))
  const thisMonthWins = thisMonthDays.filter((d) => d.winDay).length
  const winRateMonth =
    thisMonthDays.length > 0 ? Math.round((thisMonthWins / thisMonthDays.length) * 100) : 0

  const habitsWithStatus = habits.map((h) => ({
    id: h.id,
    name: h.name,
    icon: h.icon,
    xpValue: h.xpValue,
    completedToday: h.completions.length > 0,
  }))

  const tasksToday = tasks.length
  const tasksDone = tasks.filter((t) => t.completed).length

  const challengesData = challenges.map((c) => {
    const periodLogs =
      c.frequency === 'weekly'
        ? c.logs.filter((l) => l.weekKey === weekKey)
        : c.logs.filter((l) => l.monthKey === monthKey)
    return {
      id: c.id,
      title: c.title,
      icon: c.icon,
      targetCount: c.targetCount,
      currentCount: periodLogs.length,
      isCompleted: periodLogs.length >= c.targetCount,
    }
  })

  const xpProgress = getXpProgress(profile.totalXp)

  // Active quests preview (first 3 incomplete)
  const [activeQuestRows, winDays, tradingCheckins, fitnessCheckins] = await Promise.all([
    prisma.mainQuest.findMany({
      where: { completions: { none: {} } },
      take: 3,
      orderBy: { id: 'asc' },
    }),
    prisma.dailyScore.count({ where: { winDay: true } }),
    prisma.challengeLog.count({ where: { challenge: { category: 'trading' } } }),
    prisma.challengeLog.count({ where: { challenge: { category: 'fitness' } } }),
  ])

  const activeQuests = activeQuestRows.map((q) => {
    const req = JSON.parse(q.requirement) as { type: string; value: number }
    let current = 0
    if (req.type === 'win_days') current = winDays
    else if (req.type === 'trading_checkins') current = tradingCheckins
    else if (req.type === 'fitness_checkins') current = fitnessCheckins
    else if (req.type === 'level') current = xpProgress.level
    return {
      id: q.id,
      icon: q.icon,
      title: q.title,
      xpReward: q.xpReward,
      progress: Math.min(current, req.value),
      target: req.value,
    }
  })

  return {
    habitsWithStatus,
    tasksToday,
    tasksDone,
    score: score || { xp: 0, maxXp: 0, winDay: false },
    quote,
    pinnedGoal,
    streak,
    level: xpProgress.level,
    levelName: getLevelName(xpProgress.level),
    xpProgress,
    winRateMonth,
    challenges: challengesData,
    activeQuests,
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
          <span>{data.tasksDone}/{data.tasksToday} משימות היום הושלמו</span>
        </div>
      </div>

      {/* Challenges */}
      <div className="card p-5">
        <Link href="/challenges">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              ⚡ Challenges
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--accent-purple)' }}>הכל ›</span>
          </div>
        </Link>
        <div className="space-y-2">
          {data.challenges.map((c) => (
            <Link key={c.id} href="/challenges">
              <div
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ background: 'var(--bg-card-hover)', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '1.2rem' }}>{c.icon}</span>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {c.title}
                </span>
                <div
                  style={{
                    width: '60px',
                    height: '5px',
                    borderRadius: '3px',
                    background: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(c.currentCount / c.targetCount, 1) * 100}%`,
                      background: c.isCompleted ? '#f59e0b' : 'var(--accent-purple)',
                      borderRadius: '3px',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    color: c.isCompleted ? '#f59e0b' : 'var(--text-secondary)',
                    minWidth: '28px',
                    textAlign: 'right',
                  }}
                >
                  {c.currentCount}/{c.targetCount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Active Quests Preview */}
      {data.activeQuests.length > 0 && (
        <div className="card p-5">
          <Link href="/quests">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                📜 Main Quests
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--accent-purple)' }}>הכל ›</span>
            </div>
          </Link>
          <div className="space-y-2">
            {data.activeQuests.map((q) => (
              <Link key={q.id} href="/quests">
                <div
                  className="flex items-center gap-3 p-2 rounded-lg"
                  style={{ background: 'var(--bg-card-hover)', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{q.icon}</span>
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {q.title}
                  </span>
                  <div
                    style={{
                      width: '60px',
                      height: '5px',
                      borderRadius: '3px',
                      background: 'rgba(255,255,255,0.1)',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(q.progress / q.target, 1) * 100}%`,
                        background: 'var(--accent-purple)',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      minWidth: '36px',
                      textAlign: 'right',
                    }}
                  >
                    {q.progress}/{q.target}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StreakBadge streak={data.streak} />
        <StatCard
          icon="⚡"
          value={`${data.score.xp}`}
          label="XP היום"
          color="var(--accent-gold)"
        />
        <StatCard
          icon="🏆"
          value={`Lv.${data.level}`}
          label={data.levelName}
          color="var(--accent-purple)"
          progress={{
            current: data.xpProgress.currentLevelXp,
            max: data.xpProgress.xpNeededForNextLevel,
          }}
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
  progress,
}: {
  icon: string
  value: string
  label: string
  color: string
  progress?: { current: number; max: number }
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
      {progress && (
        <div
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
            marginTop: '4px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, progress.max > 0 ? (progress.current / progress.max) * 100 : 0)}%`,
              background: color,
              borderRadius: '2px',
              transition: 'width 300ms',
            }}
          />
        </div>
      )}
    </div>
  )
}
