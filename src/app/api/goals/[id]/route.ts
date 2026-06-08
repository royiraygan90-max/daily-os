import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const goal = await prisma.goal.update({ where: { id: parseInt(id) }, data: body })
  return Response.json(goal)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.goal.delete({ where: { id: parseInt(id) } })
  return Response.json({ deleted: true })
}
