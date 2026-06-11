'use client'

import { useState } from 'react'

interface Event {
  id: number
  title: string
  description: string | null
  color: string
  startTime: string
  endTime: string
  isRecurring: boolean
  daysOfWeek: string | null
  date: string | null
}

interface Props {
  onClose: () => void
  onAdd: (event: Event) => void
}

const PRESET_COLORS = [
  { color: '#f59e0b', label: 'זהב' },
  { color: '#7c3aed', label: 'סגול' },
  { color: '#10b981', label: 'ירוק' },
  { color: '#3b82f6', label: 'כחול' },
  { color: '#ef4444', label: 'אדום' },
  { color: '#ec4899', label: 'ורוד' },
]

const DAY_ABBR = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']

export default function AddEventModal({ onClose, onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isRecurring, setIsRecurring] = useState(true)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [color, setColor] = useState('#7c3aed')
  const [loading, setLoading] = useState(false)

  function toggleDay(day: number) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    if (isRecurring && selectedDays.length === 0) return
    if (!isRecurring && !date) return
    setLoading(true)
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || null,
        color,
        startTime,
        endTime,
        isRecurring,
        daysOfWeek: isRecurring ? JSON.stringify(selectedDays.sort()) : null,
        date: !isRecurring ? date : null,
      }),
    })
    const event = await res.json()
    onAdd(event)
    onClose()
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
          הוסף אירוע
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              כותרת
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שם האירוע"
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

          {/* Type toggle */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              סוג
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: true, label: 'קבוע' },
                { value: false, label: 'חד פעמי' },
              ].map(({ value, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setIsRecurring(value)}
                  className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    border: `1px solid ${isRecurring === value ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background:
                      isRecurring === value ? 'rgba(124,58,237,0.2)' : 'var(--bg-primary)',
                    color:
                      isRecurring === value ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Recurring: day selector */}
          {isRecurring && (
            <div>
              <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
                ימים
              </label>
              <div className="flex gap-1">
                {DAY_ABBR.map((abbr, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
                    style={{
                      border: `1px solid ${selectedDays.includes(i) ? color : 'var(--border)'}`,
                      background: selectedDays.includes(i) ? color + '33' : 'var(--bg-primary)',
                      color: selectedDays.includes(i) ? color : 'var(--text-secondary)',
                    }}
                  >
                    {abbr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* One-time: date picker */}
          {!isRecurring && (
            <div>
              <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
                תאריך
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  colorScheme: 'dark',
                }}
              />
            </div>
          )}

          {/* Times */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
                התחלה
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  colorScheme: 'dark',
                }}
              />
            </div>
            <div>
              <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
                סיום
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  colorScheme: 'dark',
                }}
              />
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              צבע
            </label>
            <div className="flex gap-2">
              {PRESET_COLORS.map(({ color: c }) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '2px solid white' : '2px solid transparent',
                    outline: color === c ? `2px solid ${c}` : 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
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
              {loading ? '...' : 'הוסף'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
