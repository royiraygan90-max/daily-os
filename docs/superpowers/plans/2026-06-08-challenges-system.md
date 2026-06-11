# Challenges System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a weekly/monthly challenges system with XP rewards, a dedicated /challenges page, Morning Brief integration, and nav links.

**Architecture:** New `Challenge` and `ChallengeLog` Prisma models store challenges and per-day check-ins. A new `DailyScore.challengeXp` field persists challenge XP across habit/task recalculations; a shared `src/lib/recalcDailyScore.ts` utility replaces the duplicated local function in both existing API routes so challengeXp is always preserved. The /challenges page follows the existing server-component + client-component split pattern used throughout the app.

**Tech Stack:** Next.js 16.2.7 App Router, Prisma 7.8.0 with `@prisma/adapter-better-sqlite3` (SQLite), React 19, TypeScript, CSS variables dark theme

---

## File Structure

**New files:**
- `src/lib/recalcDailyScore.ts` — shared DailyScore recalculation (replaces duplicated local function)
- `src/app/api/challenges/route.ts` — GET active challenges with period progress
- `src/app/api/challenges/[id]/checkin/route.ts` — POST check-in + DELETE undo
- `src/components/ChallengesClient.tsx` — full challenges UI (cards, progress, check-in)
- `src/app/challenges/page.tsx` — server component that fetches and passes data

**Modified files:**
- `prisma/schema.prisma` — add Challenge, ChallengeLog, DailyScore.challengeXp
- `prisma/seed.ts` — add 5 default challenges
- `src/lib/utils.ts` — add getWeekKey(), getMonthKey()
- `src/app/api/habits/[id]/complete/route.ts` — use shared recalcDailyScore
- `src/app/api/tasks/[id]/route.ts` — use shared recalcDailyScore
- `src/app/page.tsx` — add challenges section to Morning Brief
- `src/components/Sidebar.tsx` — add Challenges nav item
- `src/components/MobileNav.tsx` — add Challenges nav item

---

### Task 1: Schema Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add models and field to prisma/schema.prisma**

Replace the entire file content with:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "sqlite"
}

model Goal {
  id        Int      @id @default(autoincrement())
  text      String
  category  String   @default("general")
  isPinned  Boolean  @default(false)
  createdAt DateTime @default(now())
}

model Habit {
  id          Int        @id @default(autoincrement())
  name        String
  icon        String
  xpValue     Int        @default(10)
  order       Int        @default(0)
  completions HabitLog[]
}

model HabitLog {
  id        Int     @id @default(autoincrement())
  habitId   Int
  habit     Habit   @relation(fields: [habitId], references: [id])
  date      String
  completed Boolean @default(true)

  @@unique([habitId, date])
}

model Task {
  id          Int      @id @default(autoincrement())
  text        String
  priority    String   @default("medium")
  isRecurring Boolean  @default(false)
  completed   Boolean  @default(false)
  date        String
  xpValue     Int      @default(15)
  scope       String   @default("today")
  createdAt   DateTime @default(now())
}

model DailyScore {
  id           Int     @id @default(autoincrement())
  date         String  @unique
  xp           Int     @default(0)
  maxXp        Int     @default(0)
  winDay       Boolean @default(false)
  challengeXp  Int     @default(0)
}

model Quote {
  id     Int    @id @default(autoincrement())
  text   String
  author String
}

model Event {
  id          Int      @id @default(autoincrement())
  title       String
  description String?
  color       String   @default("#7c3aed")
  startTime   String
  endTime     String
  isRecurring Boolean  @default(false)
  daysOfWeek  String?
  date        String?
  createdAt   DateTime @default(now())
}

model Challenge {
  id          Int            @id @default(autoincrement())
  title       String
  description String?
  icon        String
  xpReward    Int
  frequency   String
  targetCount Int            @default(1)
  category    String         @default("general")
  isActive    Boolean        @default(true)
  logs        ChallengeLog[]
}

model ChallengeLog {
  id          Int       @id @default(autoincrement())
  challengeId Int
  challenge   Challenge @relation(fields: [challengeId], references: [id])
  date        String
  weekKey     String?
  monthKey    String?
  createdAt   DateTime  @default(now())
}
```

- [ ] **Step 2: Push schema and regenerate client**

```bash
cd /Users/royiraygan/daily-os && npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client` (or similar success message)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean)

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma src/generated/
git commit -m "feat: add Challenge, ChallengeLog models + DailyScore.challengeXp"
```

---

### Task 2: Utility functions + shared recalcDailyScore

**Files:**
- Modify: `src/lib/utils.ts`
- Create: `src/lib/recalcDailyScore.ts`
- Modify: `src/app/api/habits/[id]/complete/route.ts`
- Modify: `src/app/api/tasks/[id]/route.ts`

- [ ] **Step 1: Add getWeekKey and getMonthKey to src/lib/utils.ts**

Append to the end of `src/lib/utils.ts`:

```ts
// ISO week key "YYYY-WXX" (ISO 8601: week starts Monday, defined by Thursday)
export function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const thursday = new Date(d)
  thursday.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 3)
  const yearStart = new Date(thursday.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${thursday.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`
}

// Month key "YYYY-MM" for a given "YYYY-MM-DD" date
export function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7)
}
```

- [ ] **Step 2: Create src/lib/recalcDailyScore.ts**

```ts
import { prisma } from './prisma'

export async function recalcDailyScore(date: string) {
  const [habits, tasks, score] = await Promise.all([
    prisma.habit.findMany({ include: { completions: { where: { date } } } }),
    prisma.task.findMany({ where: { date, scope: 'today' } }),
    prisma.dailyScore.findUnique({ where: { date } }),
  ])

  const habitXp = habits.filter((h) => h.completions.length > 0).reduce((s, h) => s + h.xpValue, 0)
  const taskXp = tasks.filter((t) => t.completed).reduce((s, t) => s + t.xpValue, 0)
  const maxHabitXp = habits.reduce((s, h) => s + h.xpValue, 0)
  const maxTaskXp = tasks.reduce((s, t) => s + t.xpValue, 0)
  const cXp = score?.challengeXp ?? 0

  const xp = habitXp + taskXp + cXp
  const maxXp = maxHabitXp + maxTaskXp
  const winDay = maxXp > 0 && xp / maxXp >= 0.8

  await prisma.dailyScore.upsert({
    where: { date },
    create: { date, xp, maxXp, winDay, challengeXp: 0 },
    update: { xp, maxXp, winDay },
  })
}
```

- [ ] **Step 3: Replace src/app/api/habits/[id]/complete/route.ts**

```ts
import { prisma } from '@/lib/prisma'
import { getTodayIST } from '@/lib/utils'
import { recalcDailyScore } from '@/lib/recalcDailyScore'
import { NextRequest } from 'next/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const habitId = parseInt(id)
  const today = getTodayIST()

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date: today } },
  })

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
  } else {
    await prisma.habitLog.create({ data: { habitId, date: today } })
  }

  await recalcDailyScore(today)

  const habit = await prisma.habit.findUnique({ where: { id: habitId } })
  return Response.json({ completedToday: !existing, habit })
}
```

- [ ] **Step 4: Replace src/app/api/tasks/[id]/route.ts**

```ts
import { prisma } from '@/lib/prisma'
import { recalcDailyScore } from '@/lib/recalcDailyScore'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)
  const body = await request.json()

  const task = await prisma.task.update({
    where: { id: taskId },
    data: body,
  })

  if (task.scope === 'today') await recalcDailyScore(task.date)
  return Response.json(task)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)
  const task = await prisma.task.findUnique({ where: { id: taskId } })
  if (!task) return Response.json({ error: 'Not found' }, { status: 404 })

  await prisma.task.delete({ where: { id: taskId } })
  if (task.scope === 'today') await recalcDailyScore(task.date)
  return Response.json({ deleted: true })
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean)

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.ts src/lib/recalcDailyScore.ts src/app/api/habits/[id]/complete/route.ts src/app/api/tasks/[id]/route.ts
git commit -m "feat: add week/month key utils, shared recalcDailyScore with challengeXp"
```

---

### Task 3: Seed default challenges

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Update prisma/seed.ts**

In the clear block (where `deleteMany` calls are), add two new lines after `await prisma.event.deleteMany()`:

```ts
  await prisma.challengeLog.deleteMany()
  await prisma.challenge.deleteMany()
```

After the existing `prisma.event.createMany()` call and before `console.log('✅ Seed complete')`, add:

```ts
  await prisma.challenge.createMany({
    data: [
      {
        title: 'ימי מסחר',
        description: 'לסחור לפחות 3 ימים מתוך 5 ימי המסחר בשבוע',
        icon: '📈',
        xpReward: 150,
        frequency: 'weekly',
        targetCount: 3,
        category: 'trading',
      },
      {
        title: 'אימון כוח',
        description: '2 אימוני כוח בשבוע (Fitness Tracker)',
        icon: '💪',
        xpReward: 100,
        frequency: 'weekly',
        targetCount: 2,
        category: 'fitness',
      },
      {
        title: 'פוציבול',
        description: 'משחק פוציבול שבועי אחד לפחות',
        icon: '🏐',
        xpReward: 60,
        frequency: 'weekly',
        targetCount: 1,
        category: 'fitness',
      },
      {
        title: 'גמישות',
        description: 'אימון גמישות/מתיחות פעם בשבוע',
        icon: '🧘',
        xpReward: 60,
        frequency: 'weekly',
        targetCount: 1,
        category: 'fitness',
      },
      {
        title: 'בדיקת רכב',
        description: 'לבדוק שמן ומים לרכב פעם בחודש',
        icon: '🚗',
        xpReward: 50,
        frequency: 'monthly',
        targetCount: 1,
        category: 'life',
      },
    ],
  })
```

- [ ] **Step 2: Run seed**

```bash
npx prisma db seed
```

Expected: `✅ Seed complete`

- [ ] **Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed 5 default challenges (4 weekly + 1 monthly)"
```

---

### Task 4: GET /api/challenges

**Files:**
- Create: `src/app/api/challenges/route.ts`

- [ ] **Step 1: Create src/app/api/challenges/route.ts**

```ts
import { prisma } from '@/lib/prisma'
import { getTodayIST, getWeekKey, getMonthKey } from '@/lib/utils'

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
```

- [ ] **Step 2: Verify endpoint returns data**

```bash
curl -s http://localhost:3000/api/challenges | python3 -m json.tool
```

Expected: JSON array of 5 objects, each with `currentCount: 0`, `isCompleted: false`, `checkedInToday: false`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/challenges/route.ts
git commit -m "feat: GET /api/challenges with period progress"
```

---

### Task 5: POST + DELETE /api/challenges/[id]/checkin

**Files:**
- Create: `src/app/api/challenges/[id]/checkin/route.ts`

- [ ] **Step 1: Create src/app/api/challenges/[id]/checkin/route.ts**

```ts
import { prisma } from '@/lib/prisma'
import { getTodayIST, getWeekKey, getMonthKey } from '@/lib/utils'
import { NextRequest } from 'next/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const challengeId = parseInt(id)
  const today = getTodayIST()

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return Response.json({ error: 'Not found' }, { status: 404 })

  const weekKey = getWeekKey(today)
  const monthKey = getMonthKey(today)

  const existingToday = await prisma.challengeLog.findFirst({
    where: { challengeId, date: today },
  })
  if (existingToday) {
    const periodLogs = await getPeriodLogs(challengeId, challenge.frequency, weekKey, monthKey)
    return Response.json({
      log: existingToday,
      currentCount: periodLogs.length,
      isCompleted: periodLogs.length >= challenge.targetCount,
      checkedInToday: true,
    })
  }

  const log = await prisma.challengeLog.create({
    data: {
      challengeId,
      date: today,
      weekKey: challenge.frequency === 'weekly' ? weekKey : null,
      monthKey: challenge.frequency === 'monthly' ? monthKey : null,
    },
  })

  const periodLogs = await getPeriodLogs(challengeId, challenge.frequency, weekKey, monthKey)
  const currentCount = periodLogs.length
  const isCompleted = currentCount >= challenge.targetCount

  if (currentCount === challenge.targetCount) {
    await prisma.dailyScore.upsert({
      where: { date: today },
      create: {
        date: today,
        xp: challenge.xpReward,
        maxXp: 0,
        challengeXp: challenge.xpReward,
        winDay: false,
      },
      update: {
        challengeXp: { increment: challenge.xpReward },
        xp: { increment: challenge.xpReward },
      },
    })
  }

  return Response.json({ log, currentCount, isCompleted, checkedInToday: true }, { status: 201 })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const challengeId = parseInt(id)
  const today = getTodayIST()

  const log = await prisma.challengeLog.findFirst({
    where: { challengeId, date: today },
  })
  if (!log) return Response.json({ error: 'No check-in today' }, { status: 404 })

  await prisma.challengeLog.delete({ where: { id: log.id } })

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) return Response.json({ deleted: true })

  const weekKey = getWeekKey(today)
  const monthKey = getMonthKey(today)
  const periodLogs = await getPeriodLogs(challengeId, challenge.frequency, weekKey, monthKey)
  const currentCount = periodLogs.length

  return Response.json({
    deleted: true,
    currentCount,
    isCompleted: currentCount >= challenge.targetCount,
    checkedInToday: false,
  })
}

async function getPeriodLogs(
  challengeId: number,
  frequency: string,
  weekKey: string,
  monthKey: string
) {
  return prisma.challengeLog.findMany({
    where: {
      challengeId,
      ...(frequency === 'weekly' ? { weekKey } : { monthKey }),
    },
  })
}
```

- [ ] **Step 2: Test POST check-in (challenge 3 = פוציבול, targetCount: 1 — should complete on first check-in)**

```bash
curl -s -X POST http://localhost:3000/api/challenges/3/checkin | python3 -m json.tool
```

Expected: `{ "currentCount": 1, "isCompleted": true, "checkedInToday": true, ... }`

- [ ] **Step 3: Test DELETE undo**

```bash
curl -s -X DELETE http://localhost:3000/api/challenges/3/checkin | python3 -m json.tool
```

Expected: `{ "deleted": true, "currentCount": 0, "isCompleted": false, "checkedInToday": false }`

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/challenges/
git commit -m "feat: POST + DELETE /api/challenges/[id]/checkin with XP award on completion"
```

---

### Task 6: ChallengesClient + page

**Files:**
- Create: `src/components/ChallengesClient.tsx`
- Create: `src/app/challenges/page.tsx`

- [ ] **Step 1: Create src/components/ChallengesClient.tsx**

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
```

- [ ] **Step 2: Create src/app/challenges/page.tsx**

```tsx
import { prisma } from '@/lib/prisma'
import { getTodayIST, getWeekKey, getMonthKey } from '@/lib/utils'
import ChallengesClient from '@/components/ChallengesClient'

export const dynamic = 'force-dynamic'

export default async function ChallengesPage() {
  const today = getTodayIST()
  const weekKey = getWeekKey(today)
  const monthKey = getMonthKey(today)

  const challenges = await prisma.challenge.findMany({
    where: { isActive: true },
    include: {
      logs: { where: { OR: [{ weekKey }, { monthKey }] } },
    },
    orderBy: { id: 'asc' },
  })

  const challengesData = challenges.map((c) => {
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

  return <ChallengesClient initialChallenges={challengesData} />
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean)

- [ ] **Step 4: Verify page loads at http://localhost:3000/challenges**

Expected: page with heading "⚡ Challenges", "השבוע" section with 4 cards, "החודש" section with 1 card. Each card has icon, title, description, empty progress bar (0/N), "+ צ׳ק אין" button in category color.

- [ ] **Step 5: Commit**

```bash
git add src/components/ChallengesClient.tsx src/app/challenges/page.tsx
git commit -m "feat: challenges page with check-in UI, progress bars, XP display"
```

---

### Task 7: Morning Brief integration

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace entire src/app/page.tsx**

```tsx
import { prisma } from '@/lib/prisma'
import { getTodayIST, getDayOfYear, getLevel, getLevelName, xpToNextLevel, getWeekKey, getMonthKey } from '@/lib/utils'
import HabitCard from '@/components/HabitCard'
import DailyScoreRing from '@/components/DailyScoreRing'
import StreakBadge from '@/components/StreakBadge'
import MorningBriefClient from '@/components/MorningBriefClient'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getData() {
  const today = getTodayIST()
  const weekKey = getWeekKey(today)
  const monthKey = getMonthKey(today)

  const [habits, tasks, score, quotes, goals, allScores, challenges] = await Promise.all([
    prisma.habit.findMany({
      orderBy: { order: 'asc' },
      include: { completions: { where: { date: today } } },
    }),
    prisma.task.findMany({ where: { date: today } }),
    prisma.dailyScore.findUnique({ where: { date: today } }),
    prisma.quote.findMany({ orderBy: { id: 'asc' } }),
    prisma.goal.findMany({ where: { isPinned: true }, take: 1 }),
    prisma.dailyScore.findMany({ orderBy: { date: 'desc' } }),
    prisma.challenge.findMany({
      where: { isActive: true },
      include: { logs: { where: { OR: [{ weekKey }, { monthKey }] } } },
      orderBy: { id: 'asc' },
    }),
  ])

  const quote = quotes.length > 0 ? quotes[getDayOfYear() % quotes.length] : null
  const pinnedGoal = goals[0] || null

  let streak = 0
  const checkDate = new Date(today)
  for (const s of allScores) {
    const expected = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(checkDate)
    if (s.date === expected && s.winDay) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (s.date === expected) {
      break
    } else {
      break
    }
  }

  const totalXp = allScores.reduce((s, d) => s + d.xp, 0)
  const thisMonthPrefix = today.slice(0, 7)
  const thisMonthDays = allScores.filter((d) => d.date.startsWith(thisMonthPrefix))
  const thisMonthWins = thisMonthDays.filter((d) => d.winDay).length
  const winRateMonth =
    thisMonthDays.length > 0 ? Math.round((thisMonthWins / thisMonthDays.length) * 100) : 0

  const habitsWithStatus = habits.map((h) => ({
    id: h.id,
    name: h.name,
    icon: h.icon,
    xpValue: h.xpValue,
    completedToday: h.completions.length > 0,
  }))

  const tasksToday = tasks.length
  const tasksDone = tasks.filter((t) => t.completed).length

  const challengesData = challenges.map((c) => {
    const periodLogs =
      c.frequency === 'weekly'
        ? c.logs.filter((l) => l.weekKey === weekKey)
        : c.logs.filter((l) => l.monthKey === monthKey)
    return {
      id: c.id,
      title: c.title,
      icon: c.icon,
      targetCount: c.targetCount,
      currentCount: periodLogs.length,
      isCompleted: periodLogs.length >= c.targetCount,
    }
  })

  return {
    habitsWithStatus,
    tasksToday,
    tasksDone,
    score: score || { xp: 0, maxXp: 0, winDay: false },
    quote,
    pinnedGoal,
    streak,
    totalXp,
    level: getLevel(totalXp),
    levelName: getLevelName(getLevel(totalXp)),
    xpProgress: xpToNextLevel(totalXp),
    winRateMonth,
    challenges: challengesData,
  }
}

export default async function MorningBriefPage() {
  const data = await getData()
  const habitsDone = data.habitsWithStatus.filter((h) => h.completedToday).length
  const habitsTotal = data.habitsWithStatus.length

  const dateStr = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Greeting card */}
      <div
        className="card p-6 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(245,158,11,0.05))',
          borderColor: 'rgba(124,58,237,0.3)',
        }}
      >
        <h1 className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          בוקר טוב, רועי ⚡
        </h1>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          {dateStr}
        </p>
        {data.quote && (
          <blockquote className="border-l-2 pl-4 my-3" style={{ borderColor: 'var(--accent-purple)' }}>
            <p className="italic text-sm" style={{ color: 'var(--text-primary)' }}>
              &ldquo;{data.quote.text}&rdquo;
            </p>
            <footer className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              — {data.quote.author}
            </footer>
          </blockquote>
        )}
        {data.pinnedGoal && (
          <div
            className="mt-4 p-3 rounded-lg"
            style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            <p className="text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>
              🎯 המטרה שלך: {data.pinnedGoal.text}
            </p>
          </div>
        )}
      </div>

      {/* Today's Battle */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ⚔️ קרב היום
          </h2>
          <DailyScoreRing done={habitsDone} total={habitsTotal} size={64} />
        </div>

        <MorningBriefClient habits={data.habitsWithStatus} />

        <div className="mt-4 flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <span>✅</span>
          <span>
            {data.tasksDone}/{data.tasksToday} משימות היום הושלמו
          </span>
        </div>
      </div>

      {/* Challenges */}
      <div className="card p-5">
        <Link href="/challenges">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              ⚡ Challenges
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--accent-purple)' }}>הכל ›</span>
          </div>
        </Link>
        <div className="space-y-2">
          {data.challenges.map((c) => (
            <Link key={c.id} href="/challenges">
              <div
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ background: 'var(--bg-card-hover)', cursor: 'pointer' }}
              >
                <span style={{ fontSize: '1.2rem' }}>{c.icon}</span>
                <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                  {c.title}
                </span>
                <div
                  style={{
                    width: '60px',
                    height: '5px',
                    borderRadius: '3px',
                    background: 'rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(c.currentCount / c.targetCount, 1) * 100}%`,
                      background: c.isCompleted ? '#f59e0b' : 'var(--accent-purple)',
                      borderRadius: '3px',
                    }}
                  />
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    color: c.isCompleted ? '#f59e0b' : 'var(--text-secondary)',
                    minWidth: '28px',
                    textAlign: 'right',
                  }}
                >
                  {c.currentCount}/{c.targetCount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StreakBadge streak={data.streak} />
        <StatCard icon="⚡" value={`${data.score.xp}`} label="XP היום" color="var(--accent-gold)" />
        <StatCard
          icon="🏆"
          value={`Lv.${data.level}`}
          label={data.levelName}
          color="var(--accent-purple)"
        />
        <StatCard
          icon="📅"
          value={`${data.winRateMonth}%`}
          label="אחוז ניצחון החודש"
          color="var(--accent-green)"
        />
      </div>
    </div>
  )
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string
  value: string
  label: string
  color: string
}) {
  return (
    <div className="card p-4 flex flex-col items-center text-center gap-1">
      <span className="text-2xl">{icon}</span>
      <span className="text-xl font-bold" style={{ color }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean)

- [ ] **Step 3: Verify Morning Brief shows challenges**

Open `http://localhost:3000`

Expected: "⚡ Challenges" section with 5 rows between "קרב היום" and the stats grid. Each row has icon, title, mini progress bar (empty), counter "0/N". Clicking any row or the header navigates to /challenges.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add challenges summary section to Morning Brief"
```

---

### Task 8: Sidebar + MobileNav

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/MobileNav.tsx`

- [ ] **Step 1: Update navItems in src/components/Sidebar.tsx**

Replace the `navItems` array:

```ts
const navItems = [
  { href: '/', icon: '🌅', label: 'Morning Brief' },
  { href: '/tasks', icon: '✅', label: 'Tasks' },
  { href: '/schedule', icon: '📅', label: 'Schedule' },
  { href: '/challenges', icon: '⚡', label: 'Challenges' },
  { href: '/goals', icon: '🎯', label: 'Goals' },
  { href: '/habits', icon: '🔥', label: 'Habits' },
  { href: '/stats', icon: '📊', label: 'Stats' },
]
```

- [ ] **Step 2: Update navItems in src/components/MobileNav.tsx**

Replace the `navItems` array:

```ts
const navItems = [
  { href: '/', icon: '🌅', label: 'Brief' },
  { href: '/tasks', icon: '✅', label: 'Tasks' },
  { href: '/schedule', icon: '📅', label: 'Schedule' },
  { href: '/challenges', icon: '⚡', label: 'Challenges' },
  { href: '/goals', icon: '🎯', label: 'Goals' },
  { href: '/habits', icon: '🔥', label: 'Habits' },
  { href: '/stats', icon: '📊', label: 'Stats' },
]
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean)

- [ ] **Step 4: Verify nav**

Open `http://localhost:3000`. Click "⚡ Challenges" in the sidebar (desktop) or bottom nav (mobile). Expected: navigates to /challenges with the nav item highlighted purple.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.tsx src/components/MobileNav.tsx
git commit -m "feat: add Challenges nav item to Sidebar and MobileNav"
```
