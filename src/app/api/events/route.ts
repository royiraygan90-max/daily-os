import { prisma } from '@/lib/prisma'
import { getWeekStartIST, addDaysToDate } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const weekStart = request.nextUrl.searchParams.get('weekStart') || getWeekStartIST()
  const weekEnd = addDaysToDate(weekStart, 6)

  const events = await prisma.event.findMany({
    where: {
      OR: [
        { isRecurring: true },
        { isRecurring: false, date: { gte: weekStart, lte: weekEnd } },
      ],
    },
    orderBy: { startTime: 'asc' },
  })

  return Response.json(events)
}

export async function POST(request: NextRequest) {
  const { title, description, color, startTime, endTime, isRecurring, daysOfWeek, date } =
    await request.json()

  const event = await prisma.event.create({
    data: {
      title,
      description: description || null,
      color: color || '#7c3aed',
      startTime,
      endTime,
      isRecurring: !!isRecurring,
      daysOfWeek: isRecurring ? daysOfWeek : null,
      date: !isRecurring ? date : null,
    },
  })

  return Response.json(event, { status: 201 })
}
