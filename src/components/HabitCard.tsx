'use client'

import { useState } from 'react'
import { notifyXpUpdated } from '@/lib/utils'

interface HabitCardProps {
  id: number
  name: string
  icon: string
  xpValue: number
  completedToday: boolean
  onToggle?: (id: number, completed: boolean) => void
}

export default function HabitCard({ id, name, icon, xpValue, completedToday, onToggle }: HabitCardProps) {
  const [completed, setCompleted] = useState(completedToday)
  const [loading, setLoading] = useState(false)
  const [showXP, setShowXP] = useState(false)

  async function handleToggle() {
    if (loading) return
    setLoading(true)
    const res = await fetch(`/api/habits/${id}/complete`, { method: 'POST' })
    const data = await res.json()
    setCompleted(data.completedToday)
    if (data.completedToday) {
      setShowXP(true)
      setTimeout(() => setShowXP(false), 1500)
      notifyXpUpdated()
    }
    onToggle?.(id, data.completedToday)
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="card relative flex flex-col items-center gap-2 p-4 w-full text-center cursor-pointer select-none"
      style={{
        borderColor: completed ? 'var(--accent-green)' : 'var(--border)',
        background: completed ? 'rgba(52,211,153,0.08)' : 'var(--bg-card)',
        opacity: loading ? 0.7 : 1,
      }}
    >
      <span className="text-3xl">{icon}</span>
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {name}
      </span>
      <span
        className="text-xs px-2 py-0.5 rounded-full font-medium"
        style={{
          background: completed ? 'rgba(52,211,153,0.2)' : 'rgba(217,184,118,0.16)',
          color: completed ? 'var(--accent-green)' : 'var(--accent-purple)',
          direction: 'ltr',
          unicodeBidi: 'isolate',
        }}
      >
        +{xpValue} XP
      </span>
      {completed && (
        <span className="absolute top-2 right-2 text-lg" style={{ color: 'var(--accent-green)' }}>✓</span>
      )}
      {showXP && (
        <span
          className="xp-flash absolute -top-3 right-2 text-xs font-bold"
          style={{ color: 'var(--accent-gold)', direction: 'ltr', unicodeBidi: 'isolate' }}
        >
          +{xpValue} XP!
        </span>
      )}
    </button>
  )
}
