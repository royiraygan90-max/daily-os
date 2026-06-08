'use client'

import { useState } from 'react'
import AddChallengeModal from './AddChallengeModal'
import EditChallengeModal from './EditChallengeModal'

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
  const [pending, setPending] = useState<Set<number>>(new Set())
  const [editMode, setEditMode] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [addModalFrequency, setAddModalFrequency] = useState<'weekly' | 'monthly' | null>(null)
  const [editTarget, setEditTarget] = useState<ChallengeData | null>(null)

  const weekly = challenges.filter((c) => c.frequency === 'weekly')
  const monthly = challenges.filter((c) => c.frequency === 'monthly')

  async function handleCheckin(id: number) {
    if (pending.has(id)) return
    setPending((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/challenges/${id}/checkin`, { method: 'POST' })
      if (!res.ok) return
      const data = await res.json()
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, currentCount: data.currentCount, isCompleted: data.isCompleted, checkedInToday: data.checkedInToday }
            : c
        )
      )
    } finally {
      setPending((prev) => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function handleUndo(id: number) {
    if (pending.has(id)) return
    setPending((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/challenges/${id}/checkin`, { method: 'DELETE' })
      if (!res.ok) return
      const data = await res.json()
      setChallenges((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, currentCount: data.currentCount, isCompleted: data.isCompleted, checkedInToday: data.checkedInToday }
            : c
        )
      )
    } finally {
      setPending((prev) => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/challenges/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    setChallenges((prev) => prev.filter((c) => c.id !== id))
    setDeleteConfirmId(null)
  }

  function handleAdd(challenge: ChallengeData) {
    setChallenges((prev) => [...prev, challenge])
  }

  function handleUpdate(updated: ChallengeData) {
    setChallenges((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  function toggleEditMode() {
    setEditMode((v) => !v)
    setDeleteConfirmId(null)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          ⚡ Challenges
        </h1>
        <button
          onClick={toggleEditMode}
          style={{
            padding: '6px 14px',
            fontSize: '13px',
            borderRadius: '8px',
            background: editMode ? 'rgba(239,68,68,0.15)' : 'var(--bg-card-hover)',
            border: `1px solid ${editMode ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
            color: editMode ? '#ef4444' : 'var(--text-secondary)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {editMode ? '✓ סיום' : '⚙️ ניהול'}
        </button>
      </div>

      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            השבוע
          </h2>
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            מתאפס ביום שני
          </span>
        </div>
        <div className="space-y-3">
          {weekly.map((c) => (
            <ChallengeCard
              key={c.id}
              challenge={c}
              onCheckin={handleCheckin}
              onUndo={handleUndo}
              isLoading={pending.has(c.id)}
              editMode={editMode}
              deleteConfirmVisible={deleteConfirmId === c.id}
              onEditRequest={() => setEditTarget(c)}
              onDeleteRequest={() => setDeleteConfirmId(c.id)}
              onDeleteConfirm={() => handleDelete(c.id)}
              onDeleteCancel={() => setDeleteConfirmId(null)}
            />
          ))}
          <button
            onClick={() => setAddModalFrequency('weekly')}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              textAlign: 'center',
              borderRadius: '10px',
              border: '1.5px dashed var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ➕ אתגר חדש
          </button>
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
            <ChallengeCard
              key={c.id}
              challenge={c}
              onCheckin={handleCheckin}
              onUndo={handleUndo}
              isLoading={pending.has(c.id)}
              editMode={editMode}
              deleteConfirmVisible={deleteConfirmId === c.id}
              onEditRequest={() => setEditTarget(c)}
              onDeleteRequest={() => setDeleteConfirmId(c.id)}
              onDeleteConfirm={() => handleDelete(c.id)}
              onDeleteCancel={() => setDeleteConfirmId(null)}
            />
          ))}
          <button
            onClick={() => setAddModalFrequency('monthly')}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px',
              textAlign: 'center',
              borderRadius: '10px',
              border: '1.5px dashed var(--border)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ➕ אתגר חדש
          </button>
        </div>
      </section>

      {addModalFrequency && (
        <AddChallengeModal
          initialFrequency={addModalFrequency}
          onClose={() => setAddModalFrequency(null)}
          onAdd={handleAdd}
        />
      )}

      {editTarget && (
        <EditChallengeModal
          challenge={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={(updated) => {
            handleUpdate(updated)
            setEditTarget(null)
          }}
        />
      )}
    </div>
  )
}

function ChallengeCard({
  challenge: c,
  onCheckin,
  onUndo,
  isLoading,
  editMode,
  deleteConfirmVisible,
  onEditRequest,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  challenge: ChallengeData
  onCheckin: (id: number) => void
  onUndo: (id: number) => void
  isLoading: boolean
  editMode: boolean
  deleteConfirmVisible: boolean
  onEditRequest: () => void
  onDeleteRequest: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}) {
  const categoryColor = CATEGORY_COLORS[c.category] ?? CATEGORY_COLORS.general
  const pct = Math.min(c.currentCount / c.targetCount, 1)

  return (
    <div
      className="card p-4"
      style={{
        border: editMode
          ? '1.5px solid rgba(239,68,68,0.35)'
          : c.isCompleted
          ? '1.5px solid #f59e0b'
          : '1px solid var(--border)',
        background: editMode
          ? 'var(--bg-card)'
          : c.isCompleted
          ? 'linear-gradient(135deg, rgba(245,158,11,0.07), var(--bg-card))'
          : 'var(--bg-card)',
        boxShadow: editMode ? '0 0 0 3px rgba(239,68,68,0.08)' : 'none',
        transition: 'border 200ms, box-shadow 200ms',
      }}
    >
      <div className="flex items-start gap-4">
        <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{c.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
              {c.title}
            </span>
            {!editMode && c.isCompleted && (
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
                color: !editMode && c.isCompleted ? '#f59e0b' : 'var(--text-secondary)',
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

          {!editMode && (
            <>
              {/* Progress bar */}
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

              {/* Dots */}
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
            </>
          )}

          {/* Delete confirmation — inline below title/description */}
          {editMode && deleteConfirmVisible && (
            <div
              style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
              }}
            >
              <span style={{ color: 'var(--text-secondary)' }}>
                למחוק את &quot;{c.title}&quot;?
              </span>
              <button
                onClick={onDeleteConfirm}
                style={{
                  color: '#ef4444',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  padding: 0,
                  fontSize: '13px',
                }}
              >
                כן
              </button>
              <button
                onClick={onDeleteCancel}
                style={{
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: '13px',
                }}
              >
                לא
              </button>
            </div>
          )}
        </div>

        {/* Right side — edit controls or check-in */}
        <div className="flex flex-col gap-2 items-end" style={{ flexShrink: 0 }}>
          {editMode ? (
            <div className="flex gap-2">
              <button
                onClick={onEditRequest}
                title="עריכה"
                style={{
                  fontSize: '18px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '6px',
                  lineHeight: 1,
                }}
              >
                ✏️
              </button>
              <button
                onClick={onDeleteRequest}
                title="מחיקה"
                style={{
                  fontSize: '18px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px 4px',
                  borderRadius: '6px',
                  lineHeight: 1,
                }}
              >
                🗑️
              </button>
            </div>
          ) : c.checkedInToday ? (
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
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                ✓ נרשם היום
              </button>
              <button
                onClick={() => onUndo(c.id)}
                disabled={isLoading}
                style={{
                  fontSize: '11px',
                  color: 'var(--text-secondary)',
                  background: 'none',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                ביטול
              </button>
            </>
          ) : (
            <button
              onClick={() => onCheckin(c.id)}
              disabled={isLoading}
              className="btn-primary"
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                background: categoryColor,
                opacity: isLoading ? 0.6 : 1,
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              + צ׳ק אין
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
