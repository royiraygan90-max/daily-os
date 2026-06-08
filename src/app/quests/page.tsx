import { getOrCreateProfile } from '@/lib/playerProfile'
import { getXpProgress, getLevelName } from '@/lib/levelSystem'
import { checkAndCompleteQuests, getQuestsWithProgress } from '@/lib/questUtils'
import QuestsClient from '@/components/QuestsClient'

export const dynamic = 'force-dynamic'

export default async function QuestsPage() {
  const profile = await getOrCreateProfile()
  await checkAndCompleteQuests(profile.level)

  // Re-fetch after potential XP awards from auto-completion
  const updatedProfile = await getOrCreateProfile()
  const progress = getXpProgress(updatedProfile.totalXp)

  const quests = await getQuestsWithProgress(updatedProfile.level)

  return (
    <QuestsClient
      quests={quests}
      profile={{
        totalXp: updatedProfile.totalXp,
        level: progress.level,
        levelName: getLevelName(progress.level),
        currentLevelXp: progress.currentLevelXp,
        xpNeededForNextLevel: progress.xpNeededForNextLevel,
        progressPercent: progress.progressPercent,
      }}
    />
  )
}
