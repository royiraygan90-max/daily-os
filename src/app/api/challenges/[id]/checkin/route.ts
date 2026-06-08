import { prisma } from '@/lib/prisma'
import { getTodayIST, getWeekKey, getMonthKey } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const challengeId = parseInt(id)
  const today = getTodayIST()

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return Response.json({ error: 'Not found' }, { status: 404 })

  const weekKey = getWeekKey(today)
  const monthKey = getMonthKey(today)

  const existingToday = await prisma.challengeLog.findFirst({
    where: { challengeId, date: today },
  })
  if (existingToday) {
    const periodLogs = await getPeriodLogs(challengeId, challenge.frequency, weekKey, monthKey)
    return Response.json({
      log: existingToday,
      currentCount: periodLogs.length,
      isCompleted: periodLogs.length >= challenge.targetCount,
      checkedInToday: true,
    })
  }

  const log = await prisma.challengeLog.create({
    data: {
      challengeId,
      date: today,
      weekKey: challenge.frequency === 'weekly' ? weekKey : null,
      monthKey: challenge.frequency === 'monthly' ? monthKey : null,
    },
  })

  const periodLogs = await getPeriodLogs(challengeId, challenge.frequency, weekKey, monthKey)
  const currentCount = periodLogs.length
  const isCompleted = currentCount >= challenge.targetCount

  if (currentCount === challenge.targetCount) {
    await prisma.dailyScore.upsert({
      where: { date: today },
      create: {
        date: today,
        xp: challenge.xpReward,
        maxXp: 0,
        challengeXp: challenge.xpReward,
        winDay: false,
      },
      update: {
        challengeXp: { increment: challenge.xpReward },
        xp: { increment: challenge.xpReward },
      },
    })
  }

  return Response.json({ log, currentCount, isCompleted, checkedInToday: true }, { status: 201 })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const challengeId = parseInt(id)
  const today = getTodayIST()

  const log = await prisma.challengeLog.findFirst({
    where: { challengeId, date: today },
  })
  if (!log) return Response.json({ error: 'No check-in today' }, { status: 404 })

  await prisma.challengeLog.delete({ where: { id: log.id } })

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return Response.json({ deleted: true })

  const weekKey = getWeekKey(today)
  const monthKey = getMonthKey(today)
  const periodLogs = await getPeriodLogs(challengeId, challenge.frequency, weekKey, monthKey)
  const currentCount = periodLogs.length

  return Response.json({
    deleted: true,
    currentCount,
    isCompleted: currentCount >= challenge.targetCount,
    checkedInToday: false,
  })
}

async function getPeriodLogs(
  challengeId: number,
  frequency: string,
  weekKey: string,
  monthKey: string
) {
  return prisma.challengeLog.findMany({
    where: {
      challengeId,
      ...(frequency === 'weekly' ? { weekKey } : { monthKey }),
    },
  })
}
