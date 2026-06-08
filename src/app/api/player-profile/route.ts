import { getOrCreateProfile } from '@/lib/playerProfile'
import { getXpProgress, getLevelName } from '@/lib/levelSystem'

export async function GET() {
  const profile = await getOrCreateProfile()
  const progress = getXpProgress(profile.totalXp)
  return Response.json({
    id: profile.id,
    totalXp: profile.totalXp,
    level: progress.level,
    levelName: getLevelName(progress.level),
    currentLevelXp: progress.currentLevelXp,
    xpNeededForNextLevel: progress.xpNeededForNextLevel,
    progressPercent: progress.progressPercent,
  })
}
