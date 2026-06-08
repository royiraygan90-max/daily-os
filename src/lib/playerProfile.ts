import { prisma } from './prisma'
import { getLevelFromTotalXp } from './levelSystem'

export async function getOrCreateProfile() {
  const existing = await prisma.playerProfile.findUnique({ where: { id: 1 } })
  if (existing) return existing
  return prisma.playerProfile.create({ data: { id: 1 } })
}

export async function addTotalXp(amount: number) {
  const profile = await getOrCreateProfile()
  const newTotalXp = profile.totalXp + amount
  const newLevel = getLevelFromTotalXp(newTotalXp)
  return prisma.playerProfile.update({
    where: { id: 1 },
    data: { totalXp: newTotalXp, level: newLevel },
  })
}
