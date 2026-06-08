'use client'

import { useState } from 'react'
import HabitCard from './HabitCard'
import HeatmapCalendar from './HeatmapCalendar'
import AddHabitModal from './AddHabitModal'

interface HabitData {
  id: number
  name: string
  icon: string
  xpValue: number
  completedToday: boolean
  heatmapDays: { date: string; pct: number }[]
  streak: number
}

export default function HabitsClient({ habits: initial }: { habits: HabitData[] }) {
  const [habits, setHabits] = useState(initial)
  const [showModal, setShowModal] = useState(false)

  function handleToggle(id: number, completed: boolean) {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completedToday: completed } : h)))
  }

  function handleAdd(newHabit: { id: number; name: string; icon: string; xpValue: number; completedToday: boolean }) {
    setHabits((prev) => [
      ...prev,
      { ...newHabit, heatmapDays: [], streak: 0 },
    ])
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          🔥 הרגלים
        </h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + הרגל חדש
        </button>
      </div>

      <div className="space-y-4">
        {habits.map((h) => (
          <div key={h.id} className="card p-4">
            <div className="flex items-start gap-4">
              <div className="w-36 shrink-0">
                <HabitCard
                  id={h.id}
                  name={h.name}
                  icon={h.icon}
                  xpValue={h.xpValue}
                  completedToday={h.completedToday}
                  onToggle={handleToggle}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-medium" style={{ color: 'var(--accent-gold)' }}>
                    🔥 {h.streak} {h.streak === 1 ? 'יום' : 'ימים'} ברצף
                  </span>
                </div>
                <HeatmapCalendar days={h.heatmapDays} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <AddHabitModal onClose={() => setShowModal(false)} onAdd={handleAdd} />
      )}
    </div>
  )
}
