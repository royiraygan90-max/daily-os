import { prisma } from '@/lib/prisma'
import { getTodayIST } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function GET() {
  const today = getTodayIST()
  const habits = await prisma.habit.findMany({
    orderBy: { order: 'asc' },
    include: {
      completions: { where: { date: today } },
    },
  })

  return Response.json(
    habits.map((h) => ({
      id: h.id,
      name: h.name,
      icon: h.icon,
      xpValue: h.xpValue,
      order: h.order,
      completedToday: h.completions.length > 0,
    }))
  )
}

export async function POST(request: NextRequest) {
  const { name, icon, xpValue } = await request.json()
  const count = await prisma.habit.count()
  const habit = await prisma.habit.create({
    data: { name, icon, xpValue: xpValue ?? 10, order: count + 1 },
  })
  return Response.json(habit, { status: 201 })
}
