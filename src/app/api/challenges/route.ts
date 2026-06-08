import { prisma } from '@/lib/prisma'
import { getTodayIST, getWeekKey, getMonthKey } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function GET() {
  const today = getTodayIST()
  const weekKey = getWeekKey(today)
  const monthKey = getMonthKey(today)

  const challenges = await prisma.challenge.findMany({
    where: { isActive: true },
    include: {
      logs: {
        where: { OR: [{ weekKey }, { monthKey }] },
      },
    },
    orderBy: { id: 'asc' },
  })

  const result = challenges.map((c) => {
    const periodLogs =
      c.frequency === 'weekly'
        ? c.logs.filter((l) => l.weekKey === weekKey)
        : c.logs.filter((l) => l.monthKey === monthKey)

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      icon: c.icon,
      xpReward: c.xpReward,
      frequency: c.frequency,
      targetCount: c.targetCount,
      category: c.category,
      currentCount: periodLogs.length,
      isCompleted: periodLogs.length >= c.targetCount,
      checkedInToday: periodLogs.some((l) => l.date === today),
      logs: periodLogs.map((l) => ({ date: l.date })),
    }
  })

  return Response.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description, icon, xpReward, targetCount, frequency, category } = body

  if (!title?.trim()) {
    return Response.json({ error: 'title is required' }, { status: 400 })
  }
  if (frequency !== 'weekly' && frequency !== 'monthly') {
    return Response.json({ error: 'frequency must be weekly or monthly' }, { status: 400 })
  }

  const challenge = await prisma.challenge.create({
    data: {
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      icon: icon ? String(icon).trim() || '⭐' : '⭐',
      xpReward: Math.max(10, Math.min(500, parseInt(String(xpReward)) || 50)),
      targetCount: Math.max(1, Math.min(30, parseInt(String(targetCount)) || 1)),
      frequency: frequency as string,
      category: ['trading', 'fitness', 'life', 'general'].includes(category)
        ? (category as string)
        : 'general',
    },
  })

  return Response.json(challenge, { status: 201 })
}
