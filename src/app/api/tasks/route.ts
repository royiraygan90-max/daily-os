import { prisma } from '@/lib/prisma'
import { getTodayIST, xpForPriority } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date') || getTodayIST()

  const recurringTemplates = await prisma.task.findMany({
    where: { isRecurring: true, date: { not: date } },
  })

  for (const template of recurringTemplates) {
    const exists = await prisma.task.findFirst({
      where: { text: template.text, date, isRecurring: true },
    })
    if (!exists) {
      await prisma.task.create({
        data: {
          text: template.text,
          priority: template.priority,
          isRecurring: true,
          completed: false,
          date,
          xpValue: template.xpValue,
        },
      })
    }
  }

  const tasks = await prisma.task.findMany({
    where: { date },
    orderBy: [{ createdAt: 'asc' }],
  })

  return Response.json(tasks)
}

export async function POST(request: NextRequest) {
  const { text, priority, isRecurring, date } = await request.json()
  const d = date || getTodayIST()
  const xpValue = xpForPriority(priority || 'medium')
  const task = await prisma.task.create({
    data: { text, priority: priority || 'medium', isRecurring: !!isRecurring, date: d, xpValue },
  })
  return Response.json(task, { status: 201 })
}
