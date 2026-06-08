import { prisma } from '@/lib/prisma'
import { getTodayIST } from '@/lib/utils'
import { recalcDailyScore } from '@/lib/recalcDailyScore'
import { addTotalXp } from '@/lib/playerProfile'
import { NextRequest } from 'next/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const habitId = parseInt(id)
  const today = getTodayIST()

  const habit = await prisma.habit.findUnique({ where: { id: habitId } })
  if (!habit) return Response.json({ error: 'Not found' }, { status: 404 })

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date: today } },
  })

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
  } else {
    await prisma.habitLog.create({ data: { habitId, date: today } })
    await addTotalXp(habit.xpValue)
  }

  await recalcDailyScore(today)

  return Response.json({ completedToday: !existing, habit })
}
