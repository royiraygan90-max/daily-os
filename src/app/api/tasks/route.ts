import { prisma } from '@/lib/prisma'
import { getTodayIST, xpForPriority } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const scopeParam = searchParams.get('scope')
  const date = searchParams.get('date') || getTodayIST()

  if (!scopeParam || scopeParam === 'today') {
    const recurringTemplates = await prisma.task.findMany({
      where: { isRecurring: true, scope: 'today', date: { not: date } },
    })
    for (const template of recurringTemplates) {
      const exists = await prisma.task.findFirst({
        where: { text: template.text, date, isRecurring: true, scope: 'today' },
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
            scope: 'today',
          },
        })
      }
    }

    const tasks = await prisma.task.findMany({
      where: scopeParam ? { date, scope: 'today' } : { date },
      orderBy: [{ createdAt: 'asc' }],
    })
    return Response.json(tasks)
  }

  const tasks = await prisma.task.findMany({
    where: { scope: scopeParam },
    orderBy: [{ createdAt: 'asc' }],
  })
  return Response.json(tasks)
}

export async function POST(request: NextRequest) {
  const { text, priority, isRecurring, date, scope } = await request.json()
  const taskScope = scope || 'today'
  const d = date || getTodayIST()
  const xpValue = xpForPriority(priority || 'medium')
  const task = await prisma.task.create({
    data: {
      text,
      priority: priority || 'medium',
      isRecurring: taskScope === 'today' ? !!isRecurring : false,
      date: d,
      xpValue,
      scope: taskScope,
    },
  })
  return Response.json(task, { status: 201 })
}
