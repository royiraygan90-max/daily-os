import { prisma } from '@/lib/prisma'
import { getTodayIST, getWeekStartIST, addDaysToDate } from '@/lib/utils'
import ScheduleClient from '@/components/ScheduleClient'

export const dynamic = 'force-dynamic'

export default async function SchedulePage() {
  const today = getTodayIST()
  const weekStart = getWeekStartIST()
  const weekEnd = addDaysToDate(weekStart, 6)

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { isRecurring: true },
        { isRecurring: false, date: { gte: weekStart, lte: weekEnd } },
      ],
    },
    orderBy: { startTime: 'asc' },
  })

  return (
    <ScheduleClient
      initialWeekStart={weekStart}
      initialEvents={events}
      todayStr={today}
    />
  )
}
