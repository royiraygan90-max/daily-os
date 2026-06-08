'use client'

import { useEffect, useState } from 'react'
import XPBar from './XPBar'

interface ProfileState {
  level: number
  totalXp: number
  currentLevelXp: number
  xpNeededForNextLevel: number
  progressPercent: number
}

export default function TopBar() {
  const [hebrewDate, setHebrewDate] = useState('')
  const [dailyPct, setDailyPct] = useState(0)
  const [profile, setProfile] = useState<ProfileState>({
    level: 1,
    totalXp: 0,
    currentLevelXp: 0,
    xpNeededForNextLevel: 100,
    progressPercent: 0,
  })

  useEffect(() => {
    setHebrewDate(
      new Intl.DateTimeFormat('he-IL', {
        timeZone: 'Asia/Jerusalem',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date())
    )

    async function fetchData() {
      const [scoreRes, profileRes] = await Promise.all([
        fetch('/api/daily-score'),
        fetch('/api/player-profile'),
      ])
      const { score } = await scoreRes.json()
      const profileData = await profileRes.json()
      setDailyPct(score.maxXp > 0 ? Math.round((score.xp / score.maxXp) * 100) : 0)
      setProfile(profileData)
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header
      className="flex items-center gap-4 px-4 py-3 border-b"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <span className="text-sm shrink-0" style={{ color: 'var(--text-secondary)' }}>
        {hebrewDate}
      </span>
      <XPBar
        level={profile.level}
        totalXp={profile.totalXp}
        currentLevelXp={profile.currentLevelXp}
        xpNeededForNextLevel={profile.xpNeededForNextLevel}
        progressPercent={profile.progressPercent}
      />
      <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
        היום: {dailyPct}%
      </span>
    </header>
  )
}
