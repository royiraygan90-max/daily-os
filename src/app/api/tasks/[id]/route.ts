import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)
  const body = await request.json()

  const task = await prisma.task.update({
    where: { id: taskId },
    data: body,
  })

  await recalcDailyScore(task.date)
  return Response.json(task)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 })

  await prisma.task.delete({ where: { id: taskId } })
  await recalcDailyScore(task.date)
  return Response.json({ deleted: true })
}

async function recalcDailyScore(date: string) {
  const habits = await prisma.habit.findMany({ include: { completions: { where: { date } } } })
  const tasks = await prisma.task.findMany({ where: { date } })

  const habitXp = habits.filter((h) => h.completions.length > 0).reduce((s, h) => s + h.xpValue, 0)
  const taskXp = tasks.filter((t) => t.completed).reduce((s, t) => s + t.xpValue, 0)
  const maxHabitXp = habits.reduce((s, h) => s + h.xpValue, 0)
  const maxTaskXp = tasks.reduce((s, t) => s + t.xpValue, 0)

  const xp = habitXp + taskXp
  const maxXp = maxHabitXp + maxTaskXp
  const winDay = maxXp > 0 && xp / maxXp >= 0.8

  await prisma.dailyScore.upsert({
    where: { date },
    create: { date, xp, maxXp, winDay },
    update: { xp, maxXp, winDay },
  })
}
