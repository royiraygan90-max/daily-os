import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const eventId = parseInt(id)
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) return Response.json({ error: 'Not found' }, { status: 404 })
  await prisma.event.delete({ where: { id: eventId } })
  return Response.json({ deleted: true })
}
