'use client'

import { useState } from 'react'
import AddGoalModal from './AddGoalModal'

interface Goal {
  id: number
  text: string
  category: string
  isPinned: boolean
}

const categoryConfig: Record<string, { label: string; color: string; icon: string }> = {
  career: { label: 'קריירה', color: 'var(--accent-gold)', icon: '💼' },
  health: { label: 'בריאות', color: 'var(--accent-green)', icon: '💪' },
  money: { label: 'כסף', color: '#22d3ee', icon: '💰' },
  life: { label: 'חיים', color: 'var(--accent-purple)', icon: '🌍' },
  general: { label: 'כללי', color: 'var(--text-secondary)', icon: '⚡' },
}

const tabs = ['all', 'career', 'health', 'money', 'life', 'general']
const tabLabels: Record<string, string> = {
  all: '🌟 הכל',
  career: '💼 קריירה',
  health: '💪 בריאות',
  money: '💰 כסף',
  life: '🌍 חיים',
  general: '⚡ כללי',
}

export default function GoalsClient({ goals: initial }: { goals: Goal[] }) {
  const [goals, setGoals] = useState(initial)
  const [activeTab, setActiveTab] = useState('all')
  const [showModal, setShowModal] = useState(false)

  const pinned = goals.find((g) => g.isPinned)
  const filtered = goals.filter(
    (g) => !g.isPinned && (activeTab === 'all' || g.category === activeTab)
  )

  function handleAdd(goal: Goal) {
    setGoals((prev) => [goal, ...prev])
  }

  async function handleDelete(id: number) {
    await fetch(`/api/goals/${id}`, { method: 'DELETE' })
    setGoals((prev) => prev.filter((g) => g.id !== id))
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          🎯 מטרות
        </h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + מטרה חדשה
        </button>
      </div>

      {pinned && (
        <div
          className="card p-5 mb-6 rounded-2xl"
          style={{
            borderColor: 'var(--accent-gold)',
            background: 'rgba(245,158,11,0.08)',
            boxShadow: '0 0 20px rgba(245,158,11,0.1)',
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--accent-gold)' }}>
                📌 מטרה ראשית
              </p>
              <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {pinned.text}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all"
            style={{
              background: activeTab === tab ? 'var(--accent-purple)' : 'var(--bg-card)',
              color: activeTab === tab ? 'white' : 'var(--text-secondary)',
              border: '1px solid',
              borderColor: activeTab === tab ? 'var(--accent-purple)' : 'var(--border)',
            }}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((goal) => {
          const cfg = categoryConfig[goal.category] || categoryConfig.general
          return (
            <div
              key={goal.id}
              className="card p-4 flex items-start justify-between gap-3"
              style={{ borderColor: `${cfg.color}44` }}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{cfg.icon}</span>
                <div>
                  <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {goal.text}
                  </p>
                  <span className="text-xs mt-1 inline-block" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(goal.id)}
                className="text-xs opacity-30 hover:opacity-100 transition-opacity shrink-0"
                style={{ color: 'var(--accent-red)' }}
              >
                ✕
              </button>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="card p-8 text-center" style={{ color: 'var(--text-secondary)' }}>
            <p>אין מטרות בקטגוריה זו עדיין.</p>
          </div>
        )}
      </div>

      {showModal && <AddGoalModal onClose={() => setShowModal(false)} onAdd={handleAdd} />}
    </div>
  )
}
