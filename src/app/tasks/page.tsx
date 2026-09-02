import { prisma } from '@/lib/prisma'
import { getTodayIST, addDaysToDate, xpForPriority } from '@/lib/utils'
import TasksClient from '@/components/TasksClient'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const today = getTodayIST()

  // Tasks planned "for tomorrow" whose date has now arrived become today's tasks
  await prisma.task.updateMany({
    where: { scope: 'tomorrow', date: { lte: today } },
    data: { scope: 'today', date: today },
  })

  const recurringTemplates = await prisma.task.findMany({
    where: { isRecurring: true, scope: 'today' },
  })
  const uniqueRecurring = Array.from(
    new Map(recurringTemplates.map((t) => [t.text, t])).values()
  )
  for (const template of uniqueRecurring) {
    const exists = await prisma.task.findFirst({
      where: { text: template.text, date: today, isRecurring: true, scope: 'today' },
    })
    if (!exists) {
      await prisma.task.create({
        data: {
          text: template.text,
          priority: template.priority,
          isRecurring: true,
          completed: false,
          date: today,
          xpValue: xpForPriority(template.priority),
          scope: 'today',
        },
      })
    }
  }

  const [todayTasks, tomorrowTasks, shortTermTasks, longTermTasks] = await Promise.all([
    prisma.task.findMany({ where: { date: today, scope: 'today' }, orderBy: { createdAt: 'asc' } }),
    prisma.task.findMany({ where: { scope: 'tomorrow' }, orderBy: { createdAt: 'asc' } }),
    prisma.task.findMany({ where: { scope: 'short_term' }, orderBy: { createdAt: 'asc' } }),
    prisma.task.findMany({ where: { scope: 'long_term' }, orderBy: { createdAt: 'asc' } }),
  ])

  const dateStr = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())

  const tomorrowDateStr = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(addDaysToDate(today, 1) + 'T12:00:00'))

  return (
    <TasksClient
      todayTasks={todayTasks}
      tomorrowTasks={tomorrowTasks}
      shortTermTasks={shortTermTasks}
      longTermTasks={longTermTasks}
      dateStr={dateStr}
      tomorrowDateStr={tomorrowDateStr}
    />
  )
}
