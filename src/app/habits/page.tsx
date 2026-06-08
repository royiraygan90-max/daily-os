import { prisma } from '@/lib/prisma'
import { getTodayIST, lastNDays } from '@/lib/utils'
import HabitsClient from '@/components/HabitsClient'

export const dynamic = 'force-dynamic'

export default async function HabitsPage() {
  const today = getTodayIST()
  const days90 = lastNDays(90)

  const habits = await prisma.habit.findMany({
    orderBy: { order: 'asc' },
    include: {
      completions: {
        where: { date: { in: days90 } },
      },
    },
  })

  const habitsData = habits.map((h) => {
    const completedDates = new Set(h.completions.map((c) => c.date))

    const heatmapDays = days90.map((d) => ({ date: d, pct: completedDates.has(d) ? 1 : 0 }))

    let streak = 0
    const check = new Date(today)
    while (true) {
      const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(check)
      if (completedDates.has(dateStr)) {
        streak++
        check.setDate(check.getDate() - 1)
      } else {
        break
      }
    }

    return {
      id: h.id,
      name: h.name,
      icon: h.icon,
      xpValue: h.xpValue,
      completedToday: completedDates.has(today),
      heatmapDays,
      streak,
    }
  })

  return <HabitsClient habits={habitsData} />
}
