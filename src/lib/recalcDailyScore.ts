import { prisma } from './prisma'

export async function recalcDailyScore(date: string) {
  const [habits, tasks, score] = await Promise.all([
    prisma.habit.findMany({ include: { completions: { where: { date } } } }),
    prisma.task.findMany({ where: { date, scope: 'today' } }),
    prisma.dailyScore.findUnique({ where: { date } }),
  ])

  const habitXp = habits.filter((h) => h.completions.length > 0).reduce((s, h) => s + h.xpValue, 0)
  const taskXp = tasks.filter((t) => t.completed).reduce((s, t) => s + t.xpValue, 0)
  const maxHabitXp = habits.reduce((s, h) => s + h.xpValue, 0)
  const maxTaskXp = tasks.reduce((s, t) => s + t.xpValue, 0)
  const cXp = score?.challengeXp ?? 0

  const xp = habitXp + taskXp + cXp
  const maxXp = maxHabitXp + maxTaskXp
  const winDay = maxXp > 0 && xp / maxXp >= 0.8

  await prisma.dailyScore.upsert({
    where: { date },
    create: { date, xp, maxXp, winDay, challengeXp: 0 },
    update: { xp, maxXp, winDay },
  })
}
