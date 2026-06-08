'use client'

import { useState } from 'react'

interface AddTaskModalProps {
  onClose: () => void
  onAdd: (task: { id: number; text: string; priority: string; isRecurring: boolean; completed: boolean; date: string; xpValue: number }) => void
}

const priorities = [
  { value: 'urgent', label: 'דחוף', color: 'var(--accent-red)' },
  { value: 'high', label: 'גבוה', color: 'var(--accent-orange)' },
  { value: 'medium', label: 'בינוני', color: '#3b82f6' },
  { value: 'low', label: 'נמוך', color: 'var(--text-secondary)' },
]

export default function AddTaskModal({ onClose, onAdd }: AddTaskModalProps) {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState('medium')
  const [isRecurring, setIsRecurring] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), priority, isRecurring }),
    })
    const task = await res.json()
    onAdd(task)
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
          הוסף משימה
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              משימה
            </label>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="מה צריך לעשות?"
              className="w-full px-3 py-2 rounded-lg"
              style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              עדיפות
            </label>
            <div className="grid grid-cols-2 gap-2">
              {priorities.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    border: `1px solid ${priority === p.value ? p.color : 'var(--border)'}`,
                    background: priority === p.value ? `${p.color}22` : 'var(--bg-primary)',
                    color: priority === p.value ? p.color : 'var(--text-secondary)',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              משימה חוזרת (מופיעה כל יום)
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
