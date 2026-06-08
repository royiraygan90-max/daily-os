'use client'

import { useState } from 'react'

interface ChallengeData {
  id: number
  title: string
  description: string | null
  icon: string
  xpReward: number
  frequency: string
  targetCount: number
  category: string
  currentCount: number
  isCompleted: boolean
  checkedInToday: boolean
  logs: { date: string }[]
}

interface Props {
  challenge: ChallengeData
  onClose: () => void
  onSave: (updated: ChallengeData) => void
}

const CATEGORIES = [
  { key: 'trading', label: '📈 מסחר' },
  { key: 'fitness', label: '💪 כושר' },
  { key: 'life', label: '🌍 חיים' },
  { key: 'general', label: '⭐ כללי' },
]

export default function EditChallengeModal({ challenge, onClose, onSave }: Props) {
  const [icon, setIcon] = useState(challenge.icon)
  const [title, setTitle] = useState(challenge.title)
  const [description, setDescription] = useState(challenge.description ?? '')
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>(
    challenge.frequency as 'weekly' | 'monthly'
  )
  const [targetCount, setTargetCount] = useState(challenge.targetCount)
  const [xpReward, setXpReward] = useState(challenge.xpReward)
  const [category, setCategory] = useState(challenge.category)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/challenges/${challenge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icon: icon.trim() || '⭐',
          title: title.trim(),
          description: description.trim() || null,
          frequency,
          targetCount,
          xpReward,
          category,
        }),
      })
      if (!res.ok) return
      onSave({
        ...challenge,
        icon: icon.trim() || '⭐',
        title: title.trim(),
        description: description.trim() || null,
        frequency,
        targetCount,
        xpReward,
        category,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="card p-6 w-full max-w-sm"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          עריכת אתגר
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              אייקון (אמוג׳י)
            </label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="⭐"
              className="w-full px-3 py-2 rounded-lg text-center text-2xl"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              כותרת
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שם האתגר"
              required
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              תיאור (אופציונלי)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="פרטים נוספים..."
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              תדירות
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['weekly', 'monthly'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    border: `1px solid ${frequency === f ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background: frequency === f ? 'rgba(124,58,237,0.2)' : 'var(--bg-primary)',
                    color: frequency === f ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  }}
                >
                  {f === 'weekly' ? 'שבועי' : 'חודשי'}
                </button>
              ))}
            </div>
          </div>

          {/* Target Count */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              {frequency === 'weekly' ? 'כמה פעמים בשבוע?' : 'כמה פעמים בחודש?'}
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={targetCount}
              onChange={(e) => setTargetCount(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* XP Reward */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              פרס XP
            </label>
            <input
              type="number"
              min={10}
              max={500}
              step={10}
              value={xpReward}
              onChange={(e) => setXpReward(Math.max(10, Math.min(500, parseInt(e.target.value) || 10)))}
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              קטגוריה
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    border: `1px solid ${category === key ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background: category === key ? 'rgba(124,58,237,0.2)' : 'var(--bg-primary)',
                    color: category === key ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-primary"
              style={{ background: 'var(--bg-card-hover)' }}
            >
              ביטול
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary">
              {loading ? '...' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
