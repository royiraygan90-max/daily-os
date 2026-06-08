'use client'

import { useEffect, useState } from 'react'
import XPBar from './XPBar'

interface Score {
  xp: number
  maxXp: number
}

export default function TopBar() {
  const [score, setScore] = useState<Score>({ xp: 0, maxXp: 0 })
  const [hebrewDate, setHebrewDate] = useState('')

  useEffect(() => {
    const dateStr = new Intl.DateTimeFormat('he-IL', {
      timeZone: 'Asia/Jerusalem',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date())
    setHebrewDate(dateStr)

    async function fetchScore() {
      const res = await fetch('/api/daily-score')
      const data = await res.json()
      setScore(data.score)
    }
    fetchScore()
    const interval = setInterval(fetchScore, 30000)
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
      <XPBar xp={score.xp} maxXp={score.maxXp} />
    </header>
  )
}
