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
  const task = await prisma.task.update({ where: { id: taskId }, data: body })

  if (!existing?.completed && task.completed) {
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
