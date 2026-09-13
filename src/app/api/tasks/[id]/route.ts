import { prisma } from '@/lib/prisma'
import { recalcDailyScore } from '@/lib/recalcDailyScore'
import { addTotalXp } from '@/lib/playerProfile'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)
  const body = await request.json()

  const existing = await prisma.task.findUnique({ where: { id: taskId } })
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 })

  // A task can only ever pay out its XP once — completed can be toggled back
  // and forth afterwards without re-earning it.
  const willComplete = 'completed' in body ? body.completed : existing.completed
  const shouldAwardXp = !existing.completed && willComplete && !existing.xpAwarded

  const task = await prisma.task.update({
    where: { id: taskId },
    data: shouldAwardXp ? { ...body, xpAwarded: true } : body,
  })

  if (shouldAwardXp) {
    await addTotalXp(task.xpValue)
  }

  if (task.scope === 'today') await recalcDailyScore(task.date)
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
  if (task.scope === 'today') await recalcDailyScore(task.date)
  return Response.json({ deleted: true })
}
