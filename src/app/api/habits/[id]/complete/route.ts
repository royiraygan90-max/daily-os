import { prisma } from '@/lib/prisma'
import { getTodayIST } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const habitId = parseInt(id)
  const today = getTodayIST()

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date: today } },
  })

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
  } else {
    await prisma.habitLog.create({ data: { habitId, date: today } })
  }

  await recalcDailyScore(today)

  const habit = await prisma.habit.findUnique({ where: { id: habitId } })
  return Response.json({ completedToday: !existing, habit })
}

async function recalcDailyScore(date: string) {
  const habits = await prisma.habit.findMany({ include: { completions: { where: { date } } } })
  const tasks = await prisma.task.findMany({ where: { date } })

  const habitXp = habits
    .filter((h) => h.completions.length > 0)
    .reduce((sum, h) => sum + h.xpValue, 0)

  const taskXp = tasks
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + t.xpValue, 0)

  const maxHabitXp = habits.reduce((sum, h) => sum + h.xpValue, 0)
  const maxTaskXp = tasks.reduce((sum, t) => sum + t.xpValue, 0)

  const xp = habitXp + taskXp
  const maxXp = maxHabitXp + maxTaskXp
  const winDay = maxXp > 0 && xp / maxXp >= 0.8

  await prisma.dailyScore.upsert({
    where: { date },
    create: { date, xp, maxXp, winDay },
    update: { xp, maxXp, winDay },
  })
}
