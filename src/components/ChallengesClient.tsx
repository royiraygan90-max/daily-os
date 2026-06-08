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

const CATEGORY_COLORS: Record<string, string> = {
  trading: '#f59e0b',
  fitness: '#10b981',
  life: '#3b82f6',
  general: '#7c3aed',
}

interface Props {
  initialChallenges: ChallengeData[]
}

export default function ChallengesClient({ initialChallenges }: Props) {
  const [challenges, setChallenges] = useState(initialChallenges)

  const weekly = challenges.filter((c) => c.frequency === 'weekly')
  const monthly = challenges.filter((c) => c.frequency === 'monthly')

  async function handleCheckin(id: number) {
    const res = await fetch(`/api/challenges/${id}/checkin`, { method: 'POST' })
    const data = await res.json()
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, currentCount: data.currentCount, isCompleted: data.isCompleted, checkedInToday: data.checkedInToday }
          : c
      )
    )
  }

  async function handleUndo(id: number) {
    const res = await fetch(`/api/challenges/${id}/checkin`, { method: 'DELETE' })
    const data = await res.json()
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, currentCount: data.currentCount, isCompleted: data.isCompleted, checkedInToday: data.checkedInToday }
          : c
      )
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        ⚡ Challenges
      </h1>

      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            השבוע
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            מתאפס ביום ראשון
          </span>
        </div>
        <div className="space-y-3">
          {weekly.map((c) => (
            <ChallengeCard key={c.id} challenge={c} onCheckin={handleCheckin} onUndo={handleUndo} />
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            החודש
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            מתאפס ב-1 לחודש
          </span>
        </div>
        <div className="space-y-3">
          {monthly.map((c) => (
            <ChallengeCard key={c.id} challenge={c} onCheckin={handleCheckin} onUndo={handleUndo} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ChallengeCard({
  challenge: c,
  onCheckin,
  onUndo,
}: {
  challenge: ChallengeData
  onCheckin: (id: number) => void
  onUndo: (id: number) => void
}) {
  const categoryColor = CATEGORY_COLORS[c.category] ?? CATEGORY_COLORS.general
  const pct = Math.min(c.currentCount / c.targetCount, 1)

  return (
    <div
      className="card p-4"
      style={{
        border: c.isCompleted ? '1.5px solid #f59e0b' : '1px solid var(--border)',
        background: c.isCompleted
          ? 'linear-gradient(135deg, rgba(245,158,11,0.07), var(--bg-card))'
          : 'var(--bg-card)',
      }}
    >
      <div className="flex items-start gap-4">
        <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{c.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
              {c.title}
            </span>
            {c.isCompleted && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#f59e0b',
                  background: 'rgba(245,158,11,0.12)',
                  borderRadius: '4px',
                  padding: '1px 6px',
                }}
              >
                🏆 הושלם!
              </span>
            )}
            <span
              style={{
                marginRight: 'auto',
                fontSize: '12px',
                fontWeight: 600,
                color: c.isCompleted ? '#f59e0b' : 'var(--text-secondary)',
              }}
            >
              +{c.xpReward} XP
            </span>
          </div>

          {c.description && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {c.description}
            </p>
          )}

          <div
            style={{
              marginTop: '10px',
              height: '6px',
              borderRadius: '3px',
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${pct * 100}%`,
                borderRadius: '3px',
                background: c.isCompleted ? '#f59e0b' : 'var(--accent-purple)',
                transition: 'width 300ms ease',
              }}
            />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-1">
              {Array.from({ length: c.targetCount }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background:
                      i < c.currentCount
                        ? c.isCompleted
                          ? '#f59e0b'
                          : 'var(--accent-purple)'
                        : 'rgba(255,255,255,0.15)',
                    transition: 'background 200ms',
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {c.currentCount} / {c.targetCount}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end" style={{ flexShrink: 0 }}>
          {c.checkedInToday ? (
            <>
              <button
                disabled
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.07)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'not-allowed',
                  fontWeight: 600,
                }}
              >
                ✓ נרשם היום
              </button>
              <button
                onClick={() => onUndo(c.id)}
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                ביטול
              </button>
            </>
          ) : (
            <button
              onClick={() => onCheckin(c.id)}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '13px', background: categoryColor }}
            >
              + צ׳ק אין
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
