import { prisma } from '@/lib/prisma'
import { getTodayIST, getWeekKey, getMonthKey } from '@/lib/utils'
import ChallengesClient from '@/components/ChallengesClient'

export const dynamic = 'force-dynamic'

export default async function ChallengesPage() {
  const today = getTodayIST()
  const weekKey = getWeekKey(today)
  const monthKey = getMonthKey(today)

  const challenges = await prisma.challenge.findMany({
    where: { isActive: true },
    include: {
      logs: { where: { OR: [{ weekKey }, { monthKey }] } },
    },
    orderBy: { id: 'asc' },
  })

  const challengesData = challenges.map((c) => {
    const periodLogs =
      c.frequency === 'weekly'
        ? c.logs.filter((l) => l.weekKey === weekKey)
        : c.logs.filter((l) => l.monthKey === monthKey)

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      icon: c.icon,
      xpReward: c.xpReward,
      frequency: c.frequency,
      targetCount: c.targetCount,
      category: c.category,
      currentCount: periodLogs.length,
      isCompleted: periodLogs.length >= c.targetCount,
      checkedInToday: periodLogs.some((l) => l.date === today),
      logs: periodLogs.map((l) => ({ date: l.date })),
    }
  })

  return <ChallengesClient initialChallenges={challengesData} />
}
