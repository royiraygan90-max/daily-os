import { getOrCreateProfile } from '@/lib/playerProfile'
import { getXpProgress, getLevelName } from '@/lib/levelSystem'
import { checkAndCompleteQuests, getQuestsWithProgress } from '@/lib/questUtils'

export async function GET() {
  const profile = await getOrCreateProfile()
  await checkAndCompleteQuests(profile.level)

  // Re-fetch after potential XP awards from quest auto-completion
  const updatedProfile = await getOrCreateProfile()
  const progress = getXpProgress(updatedProfile.totalXp)

  const quests = await getQuestsWithProgress(updatedProfile.level)

  return Response.json({
    quests,
    profile: {
      totalXp: updatedProfile.totalXp,
      level: progress.level,
      levelName: getLevelName(progress.level),
      currentLevelXp: progress.currentLevelXp,
      xpNeededForNextLevel: progress.xpNeededForNextLevel,
      progressPercent: progress.progressPercent,
    },
  })
}
