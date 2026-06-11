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
  scope: string
}

type Scope = 'today' | 'short_term' | 'long_term'

const TABS: { scope: Scope; label: string }[] = [
  { scope: 'today', label: '📅 היום' },
  { scope: 'short_term', label: '📆 טווח קרוב' },
  { scope: 'long_term', label: '🎯 טווח ארוך' },
]

const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low']
const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  urgent: { label: 'דחוף', color: 'var(--accent-red)' },
  high: { label: 'גבוה', color: 'var(--accent-orange)' },
  medium: { label: 'בינוני', color: '#3b82f6' },
  low: { label: 'נמוך', color: 'var(--text-secondary)' },
}

interface Props {
  todayTasks: Task[]
  shortTermTasks: Task[]
  longTermTasks: Task[]
  dateStr: string
}

export default function TasksClient({ todayTasks, shortTermTasks, longTermTasks, dateStr }: Props) {
  const [byScope, setByScope] = useState<Record<Scope, Task[]>>(() => ({
    today: todayTasks,
    short_term: shortTermTasks,
    long_term: longTermTasks,
  }))
  const [activeTab, setActiveTab] = useState<Scope>('today')
  const [showModal, setShowModal] = useState(false)

  async function toggleTask(id: number, scope: Scope) {
    const task = byScope[scope].find((t) => t.id === id)
    if (!task) return
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !task.completed }),
    })
    const updated = await res.json()
    setByScope((prev) => ({ ...prev, [scope]: prev[scope].map((t) => (t.id === id ? updated : t)) }))
  }

  async function deleteTask(id: number, scope: Scope) {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setByScope((prev) => ({ ...prev, [scope]: prev[scope].filter((t) => t.id !== id) }))
  }

  function handleAdd(task: Task) {
    const scope = (task.scope as Scope) || 'today'
    setByScope((prev) => ({ ...prev, [scope]: [...prev[scope], task] }))
    setActiveTab(scope)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ✅ משימות
          </h1>
          {activeTab === 'today' && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {dateStr}
            </p>
          )}
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + הוסף משימה
        </button>
      </div>

      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.scope}
            onClick={() => setActiveTab(tab.scope)}
            className="px-4 py-2 text-sm font-medium transition-all relative"
            style={{ color: activeTab === tab.scope ? 'var(--accent-purple)' : 'var(--text-secondary)' }}
          >
            {tab.label}
            {activeTab === tab.scope && (
              <div
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t"
                style={{ background: 'var(--accent-purple)' }}
              />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'today' && (
        <TodayTab
          tasks={byScope.today}
          onToggle={(id) => toggleTask(id, 'today')}
          onDelete={(id) => deleteTask(id, 'today')}
        />
      )}

      {activeTab === 'short_term' && (
        <FlatTab
          tasks={byScope.short_term}
          scope="short_term"
          onToggle={(id) => toggleTask(id, 'short_term')}
          onDelete={(id) => deleteTask(id, 'short_term')}
        />
      )}

      {activeTab === 'long_term' && (
        <FlatTab
          tasks={byScope.long_term}
          scope="long_term"
          onToggle={(id) => toggleTask(id, 'long_term')}
          onDelete={(id) => deleteTask(id, 'long_term')}
        />
      )}

      {showModal && (
        <AddTaskModal
          defaultScope={activeTab}
          onClose={() => setShowModal(false)}
          onAdd={handleAdd}
        />
      )}
    </div>
  )
}

function TodayTab({
  tasks,
  onToggle,
  onDelete,
}: {
  tasks: Task[]
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}) {
  const grouped = PRIORITY_ORDER.reduce<Record<string, Task[]>>((acc, p) => {
    acc[p] = tasks.filter((t) => t.priority === p)
    return acc
  }, {})

  if (tasks.length === 0) return <EmptyState />

  return (
    <div className="space-y-6">
      {PRIORITY_ORDER.map((priority) => {
        const group = grouped[priority]
        if (group.length === 0) return null
        const { label, color } = PRIORITY_LABELS[priority]
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
                <TaskRow
                  key={task.id}
                  task={task}
                  showXp
                  isToday
                  onToggle={() => onToggle(task.id)}
                  onDelete={() => onDelete(task.id)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function FlatTab({
  tasks,
  scope,
  onToggle,
  onDelete,
}: {
  tasks: Task[]
  scope: Scope
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}) {
  if (tasks.length === 0) return <EmptyState />
  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          showXp={false}
          isToday={false}
          onToggle={() => onToggle(task.id)}
          onDelete={() => onDelete(task.id)}
        />
      ))}
    </div>
  )
}

function TaskRow({
  task,
  showXp,
  isToday,
  onToggle,
  onDelete,
}: {
  task: Task
  showXp: boolean
  isToday: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div
      className="card flex items-center gap-3 px-4 py-3"
      style={{
        borderColor: task.completed ? 'rgba(16,185,129,0.3)' : 'var(--border)',
        background: task.completed ? 'rgba(16,185,129,0.05)' : 'var(--bg-card)',
      }}
    >
      <button
        onClick={onToggle}
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
          opacity: task.completed && !isToday ? 0.6 : 1,
        }}
      >
        {task.text}
      </span>
      {task.isRecurring && isToday && (
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ background: 'rgba(124,58,237,0.2)', color: 'var(--accent-purple)' }}
        >
          🔄
        </span>
      )}
      {showXp && (
        <span className="text-xs" style={{ color: 'var(--accent-gold)' }}>
          +{task.xpValue}
        </span>
      )}
      <button
        onClick={onDelete}
        className="opacity-40 hover:opacity-100 transition-opacity text-base leading-none"
        style={{ color: 'var(--accent-red)' }}
      >
        🗑
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="card p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
      <p>אין משימות. הוסף אחת!</p>
    </div>
  )
}
