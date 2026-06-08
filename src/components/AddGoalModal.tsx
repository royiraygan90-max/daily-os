'use client'

import { useState } from 'react'

interface AddGoalModalProps {
  onClose: () => void
  onAdd: (goal: { id: number; text: string; category: string; isPinned: boolean }) => void
}

const categories = [
  { value: 'career', label: '💼 קריירה', color: 'var(--accent-gold)' },
  { value: 'health', label: '💪 בריאות', color: 'var(--accent-green)' },
  { value: 'money', label: '💰 כסף', color: '#22d3ee' },
  { value: 'life', label: '🌍 חיים', color: 'var(--accent-purple)' },
  { value: 'general', label: '⚡ כללי', color: 'var(--text-secondary)' },
]

export default function AddGoalModal({ onClose, onAdd }: AddGoalModalProps) {
  const [text, setText] = useState('')
  const [category, setCategory] = useState('general')
  const [isPinned, setIsPinned] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), category, isPinned }),
    })
    const goal = await res.json()
    onAdd(goal)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div className="card p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          הוסף מטרה חדשה
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              המטרה שלך
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="מה אתה רוצה להשיג?"
              rows={3}
              className="w-full px-3 py-2 rounded-lg resize-none"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              קטגוריה
            </label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className="px-3 py-2 rounded-lg text-sm transition-all text-right"
                  style={{
                    border: `1px solid ${category === c.value ? c.color : 'var(--border)'}`,
                    background: category === c.value ? `${c.color}22` : 'var(--bg-primary)',
                    color: category === c.value ? c.color : 'var(--text-secondary)',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              📌 נעץ מטרה זו בראש
            </span>
          </label>
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
