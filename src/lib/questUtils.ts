import { prisma } from './prisma'
import { addTotalXp } from './playerProfile'

export interface QuestWithProgress {
  id: number
  title: string
  description: string
  icon: string
  xpReward: number
  requirement: { type: string; value: number }
  isRepeatable: boolean
  isCompleted: boolean
  completedAt: string | null
  progress: number
}

export async function getProgressForType(type: string, level: number): Promise<number> {
  if (type === 'win_days') {
    return prisma.dailyScore.count({ where: { winDay: true } })
  }
  if (type === 'trading_checkins') {
    return prisma.challengeLog.count({ where: { challenge: { category: 'trading' } } })
  }
  if (type === 'fitness_checkins') {
    return prisma.challengeLog.count({ where: { challenge: { category: 'fitness' } } })
  }
  if (type === 'level') {
    return level
  }
  return 0
}

export async function checkAndCompleteQuests(level: number): Promise<void> {
  const incompleteQuests = await prisma.mainQuest.findMany({
    where: { completions: { none: {} } },
  })

  for (const quest of incompleteQuests) {
    const req = JSON.parse(quest.requirement) as { type: string; value: number }
    const current = await getProgressForType(req.type, level)
    if (current >= req.value) {
      await prisma.mainQuestLog.create({ data: { questId: quest.id } })
      await addTotalXp(quest.xpReward)
    }
  }
}

export async function getQuestsWithProgress(level: number): Promise<QuestWithProgress[]> {
  const quests = await prisma.mainQuest.findMany({
    include: { completions: { orderBy: { completedAt: 'asc' }, take: 1 } },
    orderBy: { id: 'asc' },
  })

  return Promise.all(
    quests.map(async (q) => {
      const req = JSON.parse(q.requirement) as { type: string; value: number }
      const isCompleted = q.completions.length > 0
      const current = isCompleted ? req.value : await getProgressForType(req.type, level)
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        icon: q.icon,
        xpReward: q.xpReward,
        requirement: req,
        isRepeatable: q.isRepeatable,
        isCompleted,
        completedAt: q.completions[0]?.completedAt.toISOString() ?? null,
        progress: Math.min(current, req.value),
      }
    })
  )
}
