import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET() {
  const goals = await prisma.goal.findMany({
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  })
  return Response.json(goals)
}

export async function POST(request: NextRequest) {
  const { text, category, isPinned } = await request.json()
  const goal = await prisma.goal.create({
    data: { text, category: category || 'general', isPinned: !!isPinned },
  })
  return Response.json(goal, { status: 201 })
}
