import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const challengeId = parseInt(id)
  const body = await req.json()
  const { title, description, icon, xpReward, targetCount, frequency, category } = body

  if (frequency !== undefined && frequency !== 'weekly' && frequency !== 'monthly') {
    return Response.json({ error: 'frequency must be weekly or monthly' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (title !== undefined) update.title = String(title).trim()
  if (description !== undefined) update.description = description ? String(description).trim() : null
  if (icon !== undefined) update.icon = String(icon).trim() || '⭐'
  if (xpReward !== undefined) update.xpReward = Math.max(10, Math.min(500, parseInt(String(xpReward)) || 10))
  if (targetCount !== undefined) update.targetCount = Math.max(1, Math.min(30, parseInt(String(targetCount)) || 1))
  if (frequency !== undefined) update.frequency = frequency
  if (category !== undefined) {
    update.category = ['trading', 'fitness', 'life', 'general'].includes(category)
      ? category
      : 'general'
  }

  const challenge = await prisma.challenge.update({
    where: { id: challengeId },
    data: update,
  })

  return Response.json(challenge)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.challenge.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  })
  return Response.json({ success: true })
}
