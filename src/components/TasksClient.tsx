'use client'

import { useState } from 'react'
import AddTaskModal from './AddTaskModal'

interface Task {
  id: number
  text: string
  priority: string
  isRecurring: boolean
  completed: boolean
  date: string
  xpValue: number
}

const priorityOrder = ['urgent', 'high', 'medium', 'low']
const priorityLabels: Record<string, { label: string; color: string }> = {
  urgent: { label: 'דחוף', color: 'var(--accent-red)' },
  high: { label: 'גבוה', color: 'var(--accent-orange)' },
  medium: { label: 'בינוני', color: '#3b82f6' },
  low: { label: 'נמוך', color: 'var(--text-secondary)' },
}

export default function TasksClient({ tasks: initial, dateStr }: { tasks: Task[]; dateStr: string }) {
  const [tasks, setTasks] = useState(initial)
  const [showModal, setShowModal] = useState(false)

  async function toggleTask(id: number) {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    })
    const updated = await res.json()
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
  }

  async function deleteTask(id: number) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  function handleAdd(task: Task) {
    setTasks((prev) => [...prev, task])
  }

  const grouped = priorityOrder.reduce<Record<string, Task[]>>((acc, p) => {
    acc[p] = tasks.filter((t) => t.priority === p)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ✅ משימות
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {dateStr}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + הוסף משימה
        </button>
      </div>

      <div className="space-y-6">
        {priorityOrder.map((priority) => {
          const group = grouped[priority]
          if (group.length === 0) return null
          const { label, color } = priorityLabels[priority]
          return (
            <div key={priority}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
                  {label}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  ({group.filter((t) => t.completed).length}/{group.length})
                </span>
              </div>
              <div className="space-y-2">
                {group.map((task) => (
                  <div
                    key={task.id}
                    className="card flex items-center gap-3 px-4 py-3"
                    style={{
                      borderColor: task.completed ? 'rgba(16,185,129,0.3)' : 'var(--border)',
                      background: task.completed ? 'rgba(16,185,129,0.05)' : 'var(--bg-card)',
                    }}
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all"
                      style={{
                        borderColor: task.completed ? 'var(--accent-green)' : 'var(--border)',
                        background: task.completed ? 'var(--accent-green)' : 'transparent',
                      }}
                    >
                      {task.completed && <span className="text-xs text-white">✓</span>}
                    </button>
                    <span
                      className="flex-1 text-sm"
                      style={{
                        color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)',
                        textDecoration: task.completed ? 'line-through' : 'none',
                      }}
                    >
                      {task.text}
                    </span>
                    {task.isRecurring && (
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.2)', color: 'var(--accent-purple)' }}>
                        🔄
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--accent-gold)' }}>
                      +{task.xpValue}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-xs opacity-40 hover:opacity-100 transition-opacity"
                      style={{ color: 'var(--accent-red)' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {tasks.length === 0 && (
          <div className="card p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            <p>אין משימות להיום. הוסף אחת!</p>
          </div>
        )}
      </div>

      {showModal && <AddTaskModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
    </div>
  )
}
