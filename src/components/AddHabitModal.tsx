'use client'

import { useState } from 'react'

interface AddHabitModalProps {
  onClose: () => void
  onAdd: (habit: { id: number; name: string; icon: string; xpValue: number; completedToday: boolean }) => void
}

export default function AddHabitModal({ onClose, onAdd }: AddHabitModalProps) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('⭐')
  const [xpValue, setXpValue] = useState(10)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const res = await fetch('/api/habits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), icon, xpValue }),
    })
    const habit = await res.json()
    onAdd({ ...habit, completedToday: false })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="card p-6 w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          הוסף הרגל חדש
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              אייקון
            </label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-center text-2xl"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              maxLength={2}
            />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              שם הרגל
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="למשל: קריאה יומית"
              className="w-full px-3 py-2 rounded-lg"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              ערך XP
            </label>
            <input
              type="number"
              value={xpValue}
              onChange={(e) => setXpValue(parseInt(e.target.value) || 10)}
              min={5}
              max={100}
              className="w-full px-3 py-2 rounded-lg"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 btn-primary" style={{ background: 'var(--bg-card-hover)' }}>
              ביטול
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-primary">
              {loading ? '...' : 'הוסף'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
