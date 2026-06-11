# Challenges CRUD Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full CRUD management for Challenges — API endpoints for create/update/soft-delete, two modal components, edit mode on the /challenges page with inline delete confirmation and add buttons.

**Architecture:** New `PATCH`/`DELETE` handlers go in a new `src/app/api/challenges/[id]/route.ts`; `POST` is added to the existing `route.ts`. Two new modal components (`AddChallengeModal`, `EditChallengeModal`) are purpose-built for challenge fields. `ChallengesClient.tsx` gains edit mode state, wires up the modals, and renders add/edit/delete controls without touching the existing check-in logic.

**Tech Stack:** Next.js 16.2.7 App Router, Prisma 7.8.0 + SQLite, TypeScript, Tailwind via CSS variables (`var(--bg-card)`, `var(--accent-purple)`, etc.)

**IMPORTANT — before writing any code:** Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md` for Route Handler conventions. Key points: async params (`{ params }: { params: Promise<{ id: string }> }`, then `const { id } = await params`), `Response.json()` for responses, `export const dynamic = 'force-dynamic'` on page server components.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/api/challenges/route.ts` | Modify | Add `POST` handler |
| `src/app/api/challenges/[id]/route.ts` | **Create** | `PATCH` (update) + `DELETE` (soft-delete) |
| `src/components/AddChallengeModal.tsx` | **Create** | Form to create a new challenge |
| `src/components/EditChallengeModal.tsx` | **Create** | Form to edit existing challenge (pre-filled) |
| `src/components/ChallengesClient.tsx` | Modify | Edit mode, delete confirm, add buttons, modal wiring |

---

## Existing Code Context

### Prisma Challenge model (from `prisma/schema.prisma`)

```prisma
model Challenge {
  id          Int            @id @default(autoincrement())
  title       String
  description String?
  icon        String
  xpReward    Int
  frequency   String         // "weekly" | "monthly"
  targetCount Int            @default(1)
  category    String         @default("general") // "trading" | "fitness" | "life" | "general"
  isActive    Boolean        @default(true)
  logs        ChallengeLog[]
}
```

### ChallengeData interface (used throughout the client)

```ts
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
```

### Styling patterns (from `src/components/AddEventModal.tsx` and `ChallengesClient.tsx`)

```tsx
// Modal backdrop
<div className="fixed inset-0 flex items-center justify-center z-50 p-4"
     style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
  <div className="card p-6 w-full max-w-sm"
       style={{ maxHeight: '90vh', overflowY: 'auto' }}
       onClick={(e) => e.stopPropagation()}>

// Input
<input className="w-full px-3 py-2 rounded-lg"
       style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />

// Toggle button (active/inactive)
style={{
  border: `1px solid ${isActive ? 'var(--accent-purple)' : 'var(--border)'}`,
  background: isActive ? 'rgba(124,58,237,0.2)' : 'var(--bg-primary)',
  color: isActive ? 'var(--accent-purple)' : 'var(--text-secondary)',
}}

// Primary button
<button className="btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }}>

// Cancel button
<button className="flex-1 btn-primary" style={{ background: 'var(--bg-card-hover)' }}>
```

### Existing route pattern (from `src/app/api/challenges/[id]/checkin/route.ts`)

```ts
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const challengeId = parseInt(id)
  // ...
  return Response.json({ ... }, { status: 201 })
}
```

---

## Task 1: API — POST /api/challenges + PATCH + DELETE /api/challenges/[id]

**Files:**
- Modify: `src/app/api/challenges/route.ts`
- Create: `src/app/api/challenges/[id]/route.ts`

- [ ] **Step 1: Add POST handler to `src/app/api/challenges/route.ts`**

The file currently only has `GET`. Add `POST` at the end:

```ts
import { prisma } from '@/lib/prisma'
import { getTodayIST, getWeekKey, getMonthKey } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function GET() {
  const today = getTodayIST()
  const weekKey = getWeekKey(today)
  const monthKey = getMonthKey(today)

  const challenges = await prisma.challenge.findMany({
    where: { isActive: true },
    include: {
      logs: {
        where: { OR: [{ weekKey }, { monthKey }] },
      },
    },
    orderBy: { id: 'asc' },
  })

  const result = challenges.map((c) => {
    const periodLogs =
      c.frequency === 'weekly'
        ? c.logs.filter((l) => l.weekKey === weekKey)
        : c.logs.filter((l) => l.monthKey === monthKey)

    return {
      id: c.id,
      title: c.title,
      description: c.description,
      icon: c.icon,
      xpReward: c.xpReward,
      frequency: c.frequency,
      targetCount: c.targetCount,
      category: c.category,
      currentCount: periodLogs.length,
      isCompleted: periodLogs.length >= c.targetCount,
      checkedInToday: periodLogs.some((l) => l.date === today),
      logs: periodLogs.map((l) => ({ date: l.date })),
    }
  })

  return Response.json(result)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description, icon, xpReward, targetCount, frequency, category } = body

  if (!title?.trim()) {
    return Response.json({ error: 'title is required' }, { status: 400 })
  }
  if (frequency !== 'weekly' && frequency !== 'monthly') {
    return Response.json({ error: 'frequency must be weekly or monthly' }, { status: 400 })
  }

  const challenge = await prisma.challenge.create({
    data: {
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      icon: icon ? String(icon).trim() || '⭐' : '⭐',
      xpReward: Math.max(10, Math.min(500, parseInt(String(xpReward)) || 50)),
      targetCount: Math.max(1, Math.min(30, parseInt(String(targetCount)) || 1)),
      frequency: frequency as string,
      category: ['trading', 'fitness', 'life', 'general'].includes(category)
        ? (category as string)
        : 'general',
    },
  })

  return Response.json(challenge, { status: 201 })
}
```

- [ ] **Step 2: Create `src/app/api/challenges/[id]/route.ts`**

```ts
import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const challengeId = parseInt(id)
  const body = await req.json()
  const { title, description, icon, xpReward, targetCount, frequency, category } = body

  if (frequency !== undefined && frequency !== 'weekly' && frequency !== 'monthly') {
    return Response.json({ error: 'frequency must be weekly or monthly' }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (title !== undefined) update.title = String(title).trim()
  if (description !== undefined) update.description = description ? String(description).trim() : null
  if (icon !== undefined) update.icon = String(icon).trim() || '⭐'
  if (xpReward !== undefined) update.xpReward = Math.max(10, Math.min(500, parseInt(String(xpReward)) || 10))
  if (targetCount !== undefined) update.targetCount = Math.max(1, Math.min(30, parseInt(String(targetCount)) || 1))
  if (frequency !== undefined) update.frequency = frequency
  if (category !== undefined) {
    update.category = ['trading', 'fitness', 'life', 'general'].includes(category)
      ? category
      : 'general'
  }

  const challenge = await prisma.challenge.update({
    where: { id: challengeId },
    data: update,
  })

  return Response.json(challenge)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await prisma.challenge.update({
    where: { id: parseInt(id) },
    data: { isActive: false },
  })
  return Response.json({ success: true })
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd /Users/royiraygan/daily-os && npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
cd /Users/royiraygan/daily-os && git add src/app/api/challenges/route.ts src/app/api/challenges/[id]/route.ts && git commit -m "feat: add POST /api/challenges and PATCH + DELETE /api/challenges/[id]"
```

---

## Task 2: AddChallengeModal component

**Files:**
- Create: `src/components/AddChallengeModal.tsx`

- [ ] **Step 1: Create `src/components/AddChallengeModal.tsx`**

```tsx
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

interface Props {
  initialFrequency: 'weekly' | 'monthly'
  onClose: () => void
  onAdd: (challenge: ChallengeData) => void
}

const CATEGORIES = [
  { key: 'trading', label: '📈 מסחר' },
  { key: 'fitness', label: '💪 כושר' },
  { key: 'life', label: '🌍 חיים' },
  { key: 'general', label: '⭐ כללי' },
]

export default function AddChallengeModal({ initialFrequency, onClose, onAdd }: Props) {
  const [icon, setIcon] = useState('⭐')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>(initialFrequency)
  const [targetCount, setTargetCount] = useState(1)
  const [xpReward, setXpReward] = useState(50)
  const [category, setCategory] = useState('general')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icon: icon.trim() || '⭐',
          title: title.trim(),
          description: description.trim() || null,
          frequency,
          targetCount,
          xpReward,
          category,
        }),
      })
      if (!res.ok) return
      const challenge = await res.json()
      onAdd({ ...challenge, currentCount: 0, isCompleted: false, checkedInToday: false, logs: [] })
      onClose()
    } finally {
      setLoading(false)
    }
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
          אתגר חדש
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              אייקון (אמוג׳י)
            </label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="⭐"
              className="w-full px-3 py-2 rounded-lg text-center text-2xl"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              כותרת
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שם האתגר"
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

          {/* Frequency */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              תדירות
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['weekly', 'monthly'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    border: `1px solid ${frequency === f ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background: frequency === f ? 'rgba(124,58,237,0.2)' : 'var(--bg-primary)',
                    color: frequency === f ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  }}
                >
                  {f === 'weekly' ? 'שבועי' : 'חודשי'}
                </button>
              ))}
            </div>
          </div>

          {/* Target Count */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              {frequency === 'weekly' ? 'כמה פעמים בשבוע?' : 'כמה פעמים בחודש?'}
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={targetCount}
              onChange={(e) => setTargetCount(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* XP Reward */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              פרס XP
            </label>
            <input
              type="number"
              min={10}
              max={500}
              step={10}
              value={xpReward}
              onChange={(e) => setXpReward(Math.max(10, Math.min(500, parseInt(e.target.value) || 10)))}
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              קטגוריה
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    border: `1px solid ${category === key ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background: category === key ? 'rgba(124,58,237,0.2)' : 'var(--bg-primary)',
                    color: category === key ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
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
              {loading ? '...' : 'הוסף אתגר'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/royiraygan/daily-os && npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
cd /Users/royiraygan/daily-os && git add src/components/AddChallengeModal.tsx && git commit -m "feat: add AddChallengeModal component"
```

---

## Task 3: EditChallengeModal component

**Files:**
- Create: `src/components/EditChallengeModal.tsx`

- [ ] **Step 1: Create `src/components/EditChallengeModal.tsx`**

Same form as AddChallengeModal but pre-filled and calls PATCH. The `onSave` callback receives the updated `ChallengeData` (merged from original + edits) so the caller can update local state without a refetch.

```tsx
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

interface Props {
  challenge: ChallengeData
  onClose: () => void
  onSave: (updated: ChallengeData) => void
}

const CATEGORIES = [
  { key: 'trading', label: '📈 מסחר' },
  { key: 'fitness', label: '💪 כושר' },
  { key: 'life', label: '🌍 חיים' },
  { key: 'general', label: '⭐ כללי' },
]

export default function EditChallengeModal({ challenge, onClose, onSave }: Props) {
  const [icon, setIcon] = useState(challenge.icon)
  const [title, setTitle] = useState(challenge.title)
  const [description, setDescription] = useState(challenge.description ?? '')
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>(
    challenge.frequency as 'weekly' | 'monthly'
  )
  const [targetCount, setTargetCount] = useState(challenge.targetCount)
  const [xpReward, setXpReward] = useState(challenge.xpReward)
  const [category, setCategory] = useState(challenge.category)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/challenges/${challenge.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          icon: icon.trim() || '⭐',
          title: title.trim(),
          description: description.trim() || null,
          frequency,
          targetCount,
          xpReward,
          category,
        }),
      })
      if (!res.ok) return
      onSave({
        ...challenge,
        icon: icon.trim() || '⭐',
        title: title.trim(),
        description: description.trim() || null,
        frequency,
        targetCount,
        xpReward,
        category,
      })
      onClose()
    } finally {
      setLoading(false)
    }
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
          עריכת אתגר
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Icon */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              אייקון (אמוג׳י)
            </label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="⭐"
              className="w-full px-3 py-2 rounded-lg text-center text-2xl"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Title */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              כותרת
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="שם האתגר"
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

          {/* Frequency */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              תדירות
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['weekly', 'monthly'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    border: `1px solid ${frequency === f ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background: frequency === f ? 'rgba(124,58,237,0.2)' : 'var(--bg-primary)',
                    color: frequency === f ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  }}
                >
                  {f === 'weekly' ? 'שבועי' : 'חודשי'}
                </button>
              ))}
            </div>
          </div>

          {/* Target Count */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              {frequency === 'weekly' ? 'כמה פעמים בשבוע?' : 'כמה פעמים בחודש?'}
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={targetCount}
              onChange={(e) => setTargetCount(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* XP Reward */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              פרס XP
            </label>
            <input
              type="number"
              min={10}
              max={500}
              step={10}
              value={xpReward}
              onChange={(e) => setXpReward(Math.max(10, Math.min(500, parseInt(e.target.value) || 10)))}
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: 'var(--bg-primary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-sm block mb-1" style={{ color: 'var(--text-secondary)' }}>
              קטגוריה
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className="px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    border: `1px solid ${category === key ? 'var(--accent-purple)' : 'var(--border)'}`,
                    background: category === key ? 'rgba(124,58,237,0.2)' : 'var(--bg-primary)',
                    color: category === key ? 'var(--accent-purple)' : 'var(--text-secondary)',
                  }}
                >
                  {label}
                </button>
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
              {loading ? '...' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/royiraygan/daily-os && npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
cd /Users/royiraygan/daily-os && git add src/components/EditChallengeModal.tsx && git commit -m "feat: add EditChallengeModal component"
```

---

## Task 4: ChallengesClient — edit mode, add buttons, modal wiring

**Files:**
- Modify: `src/components/ChallengesClient.tsx`

This replaces the entire file. Read the current file first (`src/components/ChallengesClient.tsx`) to confirm it still matches the version below before overwriting — if it has diverged, merge carefully.

- [ ] **Step 1: Replace `src/components/ChallengesClient.tsx` with the full updated version**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/royiraygan/daily-os && npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
cd /Users/royiraygan/daily-os && git add src/components/ChallengesClient.tsx && git commit -m "feat: add edit mode, delete confirm, add buttons and modals to ChallengesClient"
```
