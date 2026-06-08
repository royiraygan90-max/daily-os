'use client'

import { useState } from 'react'
import HabitCard from './HabitCard'

interface Habit {
  id: number
  name: string
  icon: string
  xpValue: number
  completedToday: boolean
}

export default function MorningBriefClient({ habits: initial }: { habits: Habit[] }) {
  const [habits, setHabits] = useState(initial)

  function handleToggle(id: number, completed: boolean) {
    setHabits((prev) => prev.map((h) => (h.id === id ? { ...h, completedToday: completed } : h)))
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {habits.map((h) => (
        <HabitCard key={h.id} {...h} onToggle={handleToggle} />
      ))}
    </div>
  )
}
