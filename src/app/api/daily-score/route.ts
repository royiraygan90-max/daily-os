import { prisma } from '@/lib/prisma'
import { getTodayIST } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const date = searchParams.get('date') || getTodayIST()

  const score = await prisma.dailyScore.findUnique({ where: { date } })

  const today = getTodayIST()
  let streak = 0
  if (date === today) {
    const allScores = await prisma.dailyScore.findMany({
      orderBy: { date: 'desc' },
      where: { winDay: true },
    })

    const checkDate = new Date(today)
    for (const s of allScores) {
      const expected = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(checkDate)
      if (s.date === expected) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }
  }

  const allScores = await prisma.dailyScore.findMany()
  const totalXp = allScores.reduce((s, d) => s + d.xp, 0)
  const totalTasks = await prisma.task.count({ where: { completed: true } })
  const thisMonthPrefix = today.slice(0, 7)
  const thisMonthDays = allScores.filter((d) => d.date.startsWith(thisMonthPrefix))
  const thisMonthWins = thisMonthDays.filter((d) => d.winDay).length
  const winRateMonth =
    thisMonthDays.length > 0 ? Math.round((thisMonthWins / thisMonthDays.length) * 100) : 0

  const top3 = [...allScores].sort((a, b) => b.xp - a.xp).slice(0, 3)

  return Response.json({
    score: score || { date, xp: 0, maxXp: 0, winDay: false },
    streak,
    totalXp,
    totalTasks,
    winRateMonth,
    top3,
  })
}
