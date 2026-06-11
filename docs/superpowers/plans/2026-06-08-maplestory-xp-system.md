# MapleStory XP & Leveling System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the linear XP/level system with MapleStory-style exponential progression using a persisted PlayerProfile, add a Main Quests system, and update all UI to reflect the new systems.

**Architecture:** A new `PlayerProfile` model persists cumulative `totalXp` and `level`, incremented by hooks in habit/task/challenge API routes. A `MainQuest` model stores quest definitions with JSON requirements; progress is computed dynamically from existing game data at read time. All level math lives in `src/lib/levelSystem.ts`; DB mutations in `src/lib/playerProfile.ts`; quest logic in `src/lib/questUtils.ts`.

**Tech Stack:** Next.js 16.2.7 App Router, Prisma 7.8.0 + SQLite (better-sqlite3 adapter), TypeScript 5, React 19

---

## File Map

**New files:**
- `src/lib/levelSystem.ts` — pure XP math (xpForLevel, totalXpForLevel, getLevelFromTotalXp, getXpProgress, getLevelName)
- `src/lib/playerProfile.ts` — getOrCreateProfile, addTotalXp
- `src/lib/questUtils.ts` — getProgressForType, checkAndCompleteQuests, getQuestsWithProgress
- `src/app/api/player-profile/route.ts` — GET: returns profile with level progress
- `src/app/api/quests/route.ts` — GET: auto-completes eligible quests, returns quests + profile
- `src/app/quests/page.tsx` — server component, Quests page
- `src/components/QuestsClient.tsx` — server display component (no 'use client')

**Modified files:**
- `prisma/schema.prisma` — add PlayerProfile, MainQuest, MainQuestLog models
- `prisma/seed.ts` — seed MainQuests + initialize PlayerProfile
- `src/lib/utils.ts` — remove getLevel, getLevelName, xpToNextLevel (replaced by levelSystem.ts)
- `src/app/api/habits/[id]/complete/route.ts` — addTotalXp on habit completion
- `src/app/api/tasks/[id]/route.ts` — addTotalXp on task completion
- `src/app/api/challenges/[id]/checkin/route.ts` — addTotalXp on challenge completion
- `src/components/XPBar.tsx` — new props for level/totalXp display
- `src/components/TopBar.tsx` — fetch /api/player-profile, show level + daily%
- `src/app/page.tsx` — use PlayerProfile for level card, add active quests preview
- `src/components/Sidebar.tsx` — add 📜 Quests nav item
- `src/components/MobileNav.tsx` — add 📜 Quests nav item

---

### Task 1: Database schema changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Append three new models to prisma/schema.prisma**

Open `prisma/schema.prisma`. After the last line of the existing `ChallengeLog` model, append:

```prisma
model PlayerProfile {
  id        Int      @id @default(autoincrement())
  totalXp   Int      @default(0)
  level     Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model MainQuest {
  id           Int            @id @default(autoincrement())
  title        String
  description  String
  icon         String
  xpReward     Int
  requirement  String
  isRepeatable Boolean        @default(false)
  completions  MainQuestLog[]
}

model MainQuestLog {
  id          Int       @id @default(autoincrement())
  questId     Int
  quest       MainQuest @relation(fields: [questId], references: [id])
  completedAt DateTime  @default(now())
}
```

- [ ] **Step 2: Push schema and regenerate Prisma client**

```bash
cd /Users/royiraygan/daily-os
npx prisma db push && npx prisma generate
```

Expected output contains:
```
Your database is now in sync with your Prisma schema.
Generated Prisma Client
```

- [ ] **Step 3: Verify TypeScript sees new types**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors about PlayerProfile, MainQuest, or MainQuestLog.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma src/generated/
git commit -m "feat: add PlayerProfile, MainQuest, MainQuestLog schema models"
```

---

### Task 2: Level system utility

**Files:**
- Create: `src/lib/levelSystem.ts`

Formula: `xpForLevel(n) = Math.floor(100 * 1.15^(n-1))` where n is current level (XP needed while AT level n to advance to n+1). Level 1 costs 100 XP, level 2 costs 115 XP, etc.

- [ ] **Step 1: Create the file**

```typescript
// XP needed while AT level n to advance to level n+1
export function xpForLevel(n: number): number {
  return Math.floor(100 * Math.pow(1.15, n - 1))
}

// Total XP required to reach level n from level 1 (0 for level 1)
export function totalXpForLevel(n: number): number {
  if (n <= 1) return 0
  let total = 0
  for (let i = 1; i < n; i++) {
    total += xpForLevel(i)
  }
  return total
}

// Current level from total accumulated XP
export function getLevelFromTotalXp(totalXp: number): number {
  let level = 1
  while (totalXp >= totalXpForLevel(level + 1)) {
    level++
  }
  return level
}

// Full progress breakdown for UI display
export function getXpProgress(totalXp: number): {
  level: number
  currentLevelXp: number
  xpNeededForNextLevel: number
  progressPercent: number
} {
  const level = getLevelFromTotalXp(totalXp)
  const levelStartXp = totalXpForLevel(level)
  const xpNeededForNextLevel = xpForLevel(level)
  const currentLevelXp = totalXp - levelStartXp
  const progressPercent = Math.min(100, Math.round((currentLevelXp / xpNeededForNextLevel) * 100))
  return { level, currentLevelXp, xpNeededForNextLevel, progressPercent }
}

export function getLevelName(level: number): string {
  if (level <= 4) return 'Rookie Trader'
  if (level <= 9) return 'Market Analyst'
  if (level <= 14) return 'Junior Trader'
  if (level <= 19) return 'Senior Trader'
  if (level <= 29) return 'Portfolio Manager'
  if (level <= 39) return 'Fund Manager'
  if (level <= 49) return 'Nostro Trader'
  if (level <= 59) return 'Head of Trading'
  if (level <= 74) return 'Market Maker'
  return 'Legend'
}
```

- [ ] **Step 2: Verify the math with tsx**

```bash
cd /Users/royiraygan/daily-os
npx tsx -e "
import { xpForLevel, totalXpForLevel, getLevelFromTotalXp, getXpProgress, getLevelName } from './src/lib/levelSystem'
console.log('xpForLevel(1):', xpForLevel(1))         // 100
console.log('xpForLevel(2):', xpForLevel(2))         // 115
console.log('xpForLevel(3):', xpForLevel(3))         // 132
console.log('totalXpForLevel(1):', totalXpForLevel(1)) // 0
console.log('totalXpForLevel(2):', totalXpForLevel(2)) // 100
console.log('totalXpForLevel(3):', totalXpForLevel(3)) // 215
console.log('getLevelFromTotalXp(0):', getLevelFromTotalXp(0))     // 1
console.log('getLevelFromTotalXp(99):', getLevelFromTotalXp(99))   // 1
console.log('getLevelFromTotalXp(100):', getLevelFromTotalXp(100)) // 2
console.log('getLevelFromTotalXp(215):', getLevelFromTotalXp(215)) // 3
console.log('getXpProgress(150):', JSON.stringify(getXpProgress(150)))
// { level:2, currentLevelXp:50, xpNeededForNextLevel:115, progressPercent:43 }
console.log('getLevelName(1):', getLevelName(1))   // Rookie Trader
console.log('getLevelName(5):', getLevelName(5))   // Market Analyst
console.log('getLevelName(75):', getLevelName(75)) // Legend
"
```

Expected: all values match the inline comments.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/levelSystem.ts
git commit -m "feat: add MapleStory-style exponential level system utility"
```

---

### Task 3: PlayerProfile database helper

**Files:**
- Create: `src/lib/playerProfile.ts`

- [ ] **Step 1: Create the file**

```typescript
import { prisma } from './prisma'
import { getLevelFromTotalXp } from './levelSystem'

export async function getOrCreateProfile() {
  const existing = await prisma.playerProfile.findUnique({ where: { id: 1 } })
  if (existing) return existing
  return prisma.playerProfile.create({ data: { id: 1 } })
}

export async function addTotalXp(amount: number) {
  const profile = await getOrCreateProfile()
  const newTotalXp = profile.totalXp + amount
  const newLevel = getLevelFromTotalXp(newTotalXp)
  return prisma.playerProfile.update({
    where: { id: 1 },
    data: { totalXp: newTotalXp, level: newLevel },
  })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/playerProfile.ts
git commit -m "feat: add PlayerProfile getOrCreate and addTotalXp helpers"
```

---

### Task 4: Hook habit completion into PlayerProfile XP

**Files:**
- Modify: `src/app/api/habits/[id]/complete/route.ts`

Call `addTotalXp(habit.xpValue)` only when creating a completion (not when toggling off). Fetch habit before the toggle so xpValue is available.

- [ ] **Step 1: Replace the entire file**

```typescript
import { prisma } from '@/lib/prisma'
import { getTodayIST } from '@/lib/utils'
import { recalcDailyScore } from '@/lib/recalcDailyScore'
import { addTotalXp } from '@/lib/playerProfile'
import { NextRequest } from 'next/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const habitId = parseInt(id)
  const today = getTodayIST()

  const habit = await prisma.habit.findUnique({ where: { id: habitId } })
  if (!habit) return Response.json({ error: 'Not found' }, { status: 404 })

  const existing = await prisma.habitLog.findUnique({
    where: { habitId_date: { habitId, date: today } },
  })

  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } })
  } else {
    await prisma.habitLog.create({ data: { habitId, date: today } })
    await addTotalXp(habit.xpValue)
  }

  await recalcDailyScore(today)

  return Response.json({ completedToday: !existing, habit })
}
```

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/habits/[id]/complete/route.ts
git commit -m "feat: award total XP when habit is completed"
```

---

### Task 5: Hook task completion into PlayerProfile XP

**Files:**
- Modify: `src/app/api/tasks/[id]/route.ts`

Award XP only when task transitions from `completed: false` to `completed: true`. Read the existing task state before the update to detect the transition.

- [ ] **Step 1: Replace the entire file**

```typescript
import { prisma } from '@/lib/prisma'
import { recalcDailyScore } from '@/lib/recalcDailyScore'
import { addTotalXp } from '@/lib/playerProfile'
import { NextRequest } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)
  const body = await request.json()

  const existing = await prisma.task.findUnique({ where: { id: taskId } })
  const task = await prisma.task.update({ where: { id: taskId }, data: body })

  if (!existing?.completed && task.completed) {
    await addTotalXp(task.xpValue)
  }

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

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/tasks/[id]/route.ts
git commit -m "feat: award total XP when task is marked complete"
```

---

### Task 6: Hook challenge completion into PlayerProfile XP

**Files:**
- Modify: `src/app/api/challenges/[id]/checkin/route.ts`

Award XP at the same moment the daily score is awarded — when `currentCount` first reaches `targetCount`.

- [ ] **Step 1: Add import at top of file**

After the existing imports in `src/app/api/challenges/[id]/checkin/route.ts`, add:

```typescript
import { addTotalXp } from '@/lib/playerProfile'
```

- [ ] **Step 2: Replace the if block that awards daily score XP**

Find the block (around line 45-60):

```typescript
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
```

Replace with:

```typescript
  if (currentCount === challenge.targetCount) {
    await Promise.all([
      prisma.dailyScore.upsert({
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
      }),
      addTotalXp(challenge.xpReward),
    ])
  }
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/challenges/[id]/checkin/route.ts
git commit -m "feat: award total XP when challenge is completed"
```

---

### Task 7: Seed MainQuests and initialize PlayerProfile

**Files:**
- Modify: `prisma/seed.ts`

Add `mainQuestLog` and `mainQuest` clearing to the top deletion block. Add PlayerProfile upsert and MainQuest seed data at the bottom.

- [ ] **Step 1: Add clearing for new tables**

In `prisma/seed.ts`, inside the `main()` function, find the block that ends with:
```typescript
  await prisma.challenge.deleteMany()
```

After that line, add:
```typescript
  await prisma.mainQuestLog.deleteMany()
  await prisma.mainQuest.deleteMany()
```

- [ ] **Step 2: Add PlayerProfile init and quest seed data**

Find the `console.log('✅ Seed complete')` line at the bottom of `main()`. Before it, insert:

```typescript
  // Initialize PlayerProfile (preserve existing user progress — upsert with no-op update)
  await prisma.playerProfile.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  })

  // Seed MainQuests
  await prisma.mainQuest.createMany({
    data: [
      {
        title: 'פתיחת הדרך',
        description: 'השלם את שגרת הבוקר המלאה פעם אחת',
        icon: '⚔️',
        xpReward: 200,
        requirement: JSON.stringify({ type: 'win_days', value: 1 }),
        isRepeatable: false,
      },
      {
        title: 'שבוע ראשון',
        description: 'השג 7 Win Days',
        icon: '🔥',
        xpReward: 500,
        requirement: JSON.stringify({ type: 'win_days', value: 7 }),
        isRepeatable: false,
      },
      {
        title: 'סוחר מתחיל',
        description: 'סמן 10 ימי מסחר',
        icon: '💹',
        xpReward: 800,
        requirement: JSON.stringify({ type: 'trading_checkins', value: 10 }),
        isRepeatable: false,
      },
      {
        title: 'עולה רמה',
        description: 'הגע ל-Level 5',
        icon: '🏆',
        xpReward: 300,
        requirement: JSON.stringify({ type: 'level', value: 5 }),
        isRepeatable: false,
      },
      {
        title: 'גוף חזק',
        description: 'השלם 20 אימוני כוח',
        icon: '💪',
        xpReward: 600,
        requirement: JSON.stringify({ type: 'fitness_checkins', value: 20 }),
        isRepeatable: false,
      },
      {
        title: 'חודש מנצח',
        description: 'השג 30 Win Days',
        icon: '🌟',
        xpReward: 1500,
        requirement: JSON.stringify({ type: 'win_days', value: 30 }),
        isRepeatable: false,
      },
      {
        title: 'מאסטר',
        description: 'הגע ל-Level 20',
        icon: '🎯',
        xpReward: 2000,
        requirement: JSON.stringify({ type: 'level', value: 20 }),
        isRepeatable: false,
      },
    ],
  })
```

- [ ] **Step 3: Run the seed**

```bash
cd /Users/royiraygan/daily-os
npx prisma db seed
```

Expected: `✅ Seed complete`

- [ ] **Step 4: Verify seed results**

```bash
npx tsx -e "
import { PrismaClient } from './src/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
const adapter = new PrismaBetterSqlite3({ url: path.resolve('./dev.db') })
const prisma = new PrismaClient({ adapter })
async function main() {
  const [questCount, profile] = await Promise.all([
    prisma.mainQuest.count(),
    prisma.playerProfile.findUnique({ where: { id: 1 } }),
  ])
  console.log('Quests seeded:', questCount)   // expected: 7
  console.log('Profile exists:', !!profile)   // expected: true
  await prisma.\$disconnect()
}
main().catch(console.error)
"
```

Expected: `Quests seeded: 7`, `Profile exists: true`

- [ ] **Step 5: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed MainQuests and initialize PlayerProfile"
```

---

### Task 8: Quest utilities and API routes

**Files:**
- Create: `src/lib/questUtils.ts`
- Create: `src/app/api/player-profile/route.ts`
- Create: `src/app/api/quests/route.ts`

- [ ] **Step 1: Create src/lib/questUtils.ts**

```typescript
import { prisma } from './prisma'
import { addTotalXp } from './playerProfile'

export interface QuestWithProgress {
  id: number
  title: string
  description: string
  icon: string
  xpReward: number
  requirement: { type: string; value: number }
  isRepeatable: boolean
  isCompleted: boolean
  completedAt: string | null
  progress: number
}

export async function getProgressForType(type: string, level: number): Promise<number> {
  if (type === 'win_days') {
    return prisma.dailyScore.count({ where: { winDay: true } })
  }
  if (type === 'trading_checkins') {
    return prisma.challengeLog.count({ where: { challenge: { category: 'trading' } } })
  }
  if (type === 'fitness_checkins') {
    return prisma.challengeLog.count({ where: { challenge: { category: 'fitness' } } })
  }
  if (type === 'level') {
    return level
  }
  return 0
}

// Checks all incomplete quests and auto-completes any that meet their requirement
export async function checkAndCompleteQuests(level: number): Promise<void> {
  const incompleteQuests = await prisma.mainQuest.findMany({
    where: { completions: { none: {} } },
  })

  for (const quest of incompleteQuests) {
    const req = JSON.parse(quest.requirement) as { type: string; value: number }
    const current = await getProgressForType(req.type, level)
    if (current >= req.value) {
      await prisma.mainQuestLog.create({ data: { questId: quest.id } })
      await addTotalXp(quest.xpReward)
    }
  }
}

// Returns all quests with computed progress
export async function getQuestsWithProgress(level: number): Promise<QuestWithProgress[]> {
  const quests = await prisma.mainQuest.findMany({
    include: { completions: { orderBy: { completedAt: 'asc' }, take: 1 } },
    orderBy: { id: 'asc' },
  })

  return Promise.all(
    quests.map(async (q) => {
      const req = JSON.parse(q.requirement) as { type: string; value: number }
      const isCompleted = q.completions.length > 0
      const current = isCompleted ? req.value : await getProgressForType(req.type, level)
      return {
        id: q.id,
        title: q.title,
        description: q.description,
        icon: q.icon,
        xpReward: q.xpReward,
        requirement: req,
        isRepeatable: q.isRepeatable,
        isCompleted,
        completedAt: q.completions[0]?.completedAt.toISOString() ?? null,
        progress: Math.min(current, req.value),
      }
    })
  )
}
```

- [ ] **Step 2: Create src/app/api/player-profile/route.ts**

First create the directory, then create the file:

```typescript
import { getOrCreateProfile } from '@/lib/playerProfile'
import { getXpProgress, getLevelName } from '@/lib/levelSystem'

export async function GET() {
  const profile = await getOrCreateProfile()
  const progress = getXpProgress(profile.totalXp)
  return Response.json({
    id: profile.id,
    totalXp: profile.totalXp,
    level: progress.level,
    levelName: getLevelName(progress.level),
    currentLevelXp: progress.currentLevelXp,
    xpNeededForNextLevel: progress.xpNeededForNextLevel,
    progressPercent: progress.progressPercent,
  })
}
```

- [ ] **Step 3: Create src/app/api/quests/route.ts**

First create the directory, then create the file:

```typescript
import { getOrCreateProfile } from '@/lib/playerProfile'
import { getXpProgress, getLevelName } from '@/lib/levelSystem'
import { checkAndCompleteQuests, getQuestsWithProgress } from '@/lib/questUtils'

export async function GET() {
  const profile = await getOrCreateProfile()
  await checkAndCompleteQuests(profile.level)

  // Re-fetch after potential XP awards from quest auto-completion
  const updatedProfile = await getOrCreateProfile()
  const progress = getXpProgress(updatedProfile.totalXp)

  const quests = await getQuestsWithProgress(updatedProfile.level)

  return Response.json({
    quests,
    profile: {
      totalXp: updatedProfile.totalXp,
      level: progress.level,
      levelName: getLevelName(progress.level),
      currentLevelXp: progress.currentLevelXp,
      xpNeededForNextLevel: progress.xpNeededForNextLevel,
      progressPercent: progress.progressPercent,
    },
  })
}
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/questUtils.ts src/app/api/player-profile/route.ts src/app/api/quests/route.ts
git commit -m "feat: add questUtils, player-profile API, and quests API"
```

---

### Task 9: Quests page and display component

**Files:**
- Create: `src/components/QuestsClient.tsx`
- Create: `src/app/quests/page.tsx`

QuestsClient is a server component (no 'use client') — pure data display, no interactivity.

- [ ] **Step 1: Create src/components/QuestsClient.tsx**

```tsx
import { QuestWithProgress } from '@/lib/questUtils'

interface ProfileData {
  totalXp: number
  level: number
  levelName: string
  currentLevelXp: number
  xpNeededForNextLevel: number
  progressPercent: number
}

interface Props {
  quests: QuestWithProgress[]
  profile: ProfileData
}

function QuestStatusBadge({ status }: { status: 'locked' | 'active' | 'completed' }) {
  if (status === 'completed') {
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#f59e0b',
          background: 'rgba(245,158,11,0.12)',
          borderRadius: '4px',
          padding: '2px 7px',
        }}
      >
        ✅ הושלם
      </span>
    )
  }
  if (status === 'locked') {
    return (
      <span
        style={{
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '4px',
          padding: '2px 7px',
        }}
      >
        🔒 לא התחיל
      </span>
    )
  }
  return (
    <span
      style={{
        fontSize: '11px',
        fontWeight: 700,
        color: 'var(--accent-purple)',
        background: 'rgba(124,58,237,0.12)',
        borderRadius: '4px',
        padding: '2px 7px',
      }}
    >
      ⚡ בתהליך
    </span>
  )
}

export default function QuestsClient({ quests, profile }: Props) {
  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          📜 Main Quests
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          המשימות הגדולות שמגדירות את הדרך שלך
        </p>
      </div>

      {/* Player Card */}
      <div
        className="card p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(245,158,11,0.08))',
          border: '1.5px solid rgba(124,58,237,0.4)',
        }}
      >
        <div className="flex items-start gap-4">
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-gold))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '22px',
              fontWeight: 800,
              color: '#fff',
            }}
          >
            {profile.level}
          </div>
          <div style={{ flex: 1 }}>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Lv. {profile.level}
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--accent-gold)' }}>
                {profile.levelName}
              </span>
            </div>
            <p className="text-lg font-bold mt-1" style={{ color: 'var(--accent-gold)' }}>
              ⚡ {profile.totalXp.toLocaleString()} XP
            </p>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                <span>
                  {profile.currentLevelXp.toLocaleString()} / {profile.xpNeededForNextLevel.toLocaleString()} XP to next level
                </span>
                <span>{profile.progressPercent}%</span>
              </div>
              <div
                style={{
                  height: '8px',
                  borderRadius: '4px',
                  background: 'rgba(255,255,255,0.1)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${profile.progressPercent}%`,
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-gold))',
                    transition: 'width 500ms ease',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quest list */}
      <div className="space-y-3">
        {quests.map((q) => {
          const status: 'locked' | 'active' | 'completed' = q.isCompleted
            ? 'completed'
            : q.progress > 0
            ? 'active'
            : 'locked'
          const pct = Math.min(1, q.progress / q.requirement.value)

          return (
            <div
              key={q.id}
              className="card p-4"
              style={{
                border: q.isCompleted
                  ? '1.5px solid rgba(245,158,11,0.5)'
                  : status === 'active'
                  ? '1.5px solid rgba(124,58,237,0.4)'
                  : '1px solid var(--border)',
                background: q.isCompleted
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.07), var(--bg-card))'
                  : 'var(--bg-card)',
                boxShadow: status === 'active' ? '0 0 0 3px rgba(124,58,237,0.08)' : 'none',
                opacity: status === 'locked' ? 0.6 : 1,
                transition: 'border 200ms, opacity 200ms',
              }}
            >
              <div className="flex items-start gap-4">
                <span style={{ fontSize: '2rem', lineHeight: 1, flexShrink: 0 }}>{q.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className="font-semibold"
                      style={{ color: 'var(--text-primary)', fontSize: '15px' }}
                    >
                      {q.title}
                    </span>
                    <QuestStatusBadge status={status} />
                    <span
                      style={{
                        marginRight: 'auto',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: q.isCompleted ? '#f59e0b' : 'var(--text-secondary)',
                      }}
                    >
                      +{q.xpReward.toLocaleString()} XP
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      marginBottom: '8px',
                    }}
                  >
                    {q.description}
                  </p>

                  {/* Progress row */}
                  <div>
                    <div
                      className="flex justify-between text-xs mb-1"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <span>
                        {q.progress.toLocaleString()} / {q.requirement.value.toLocaleString()}
                      </span>
                      {q.isCompleted && q.completedAt && (
                        <span style={{ color: '#f59e0b' }}>
                          {new Date(q.completedAt).toLocaleDateString('he-IL')}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        height: '5px',
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
                          background: q.isCompleted ? '#f59e0b' : 'var(--accent-purple)',
                          transition: 'width 300ms ease',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create src/app/quests/page.tsx**

```tsx
import { getOrCreateProfile } from '@/lib/playerProfile'
import { getXpProgress, getLevelName } from '@/lib/levelSystem'
import { checkAndCompleteQuests, getQuestsWithProgress } from '@/lib/questUtils'
import QuestsClient from '@/components/QuestsClient'

export const dynamic = 'force-dynamic'

export default async function QuestsPage() {
  const profile = await getOrCreateProfile()
  await checkAndCompleteQuests(profile.level)

  // Re-fetch after potential XP awards from auto-completion
  const updatedProfile = await getOrCreateProfile()
  const progress = getXpProgress(updatedProfile.totalXp)

  const quests = await getQuestsWithProgress(updatedProfile.level)

  return (
    <QuestsClient
      quests={quests}
      profile={{
        totalXp: updatedProfile.totalXp,
        level: progress.level,
        levelName: getLevelName(progress.level),
        currentLevelXp: progress.currentLevelXp,
        xpNeededForNextLevel: progress.xpNeededForNextLevel,
        progressPercent: progress.progressPercent,
      }}
    />
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/quests/page.tsx src/components/QuestsClient.tsx
git commit -m "feat: add Quests page with player card and quest list"
```

---

### Task 10: Update XPBar and TopBar for level display

**Files:**
- Modify: `src/components/XPBar.tsx`
- Modify: `src/components/TopBar.tsx`

XPBar now shows: `Lv.N ⚡ X,XXX XP [level progress bar] currentLevelXp/xpNeeded`
TopBar fetches both `/api/player-profile` (for level) and `/api/daily-score` (for daily %) and shows: `[date] [XPBar] היום: XX%`

- [ ] **Step 1: Rewrite src/components/XPBar.tsx**

```tsx
'use client'

interface XPBarProps {
  level: number
  totalXp: number
  currentLevelXp: number
  xpNeededForNextLevel: number
  progressPercent: number
}

export default function XPBar({
  level,
  totalXp,
  currentLevelXp,
  xpNeededForNextLevel,
  progressPercent,
}: XPBarProps) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <span className="text-sm font-bold shrink-0" style={{ color: 'var(--accent-gold)' }}>
        Lv.{level}
      </span>
      <span className="text-xs font-medium shrink-0" style={{ color: 'var(--accent-gold)' }}>
        ⚡ {totalXp.toLocaleString()} XP
      </span>
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progressPercent}%`,
            background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-gold))',
          }}
        />
      </div>
      <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
        {currentLevelXp.toLocaleString()}/{xpNeededForNextLevel.toLocaleString()}
      </span>
    </div>
  )
}
```

- [ ] **Step 2: Rewrite src/components/TopBar.tsx**

```tsx
'use client'

import { useEffect, useState } from 'react'
import XPBar from './XPBar'

interface ProfileState {
  level: number
  totalXp: number
  currentLevelXp: number
  xpNeededForNextLevel: number
  progressPercent: number
}

export default function TopBar() {
  const [hebrewDate, setHebrewDate] = useState('')
  const [dailyPct, setDailyPct] = useState(0)
  const [profile, setProfile] = useState<ProfileState>({
    level: 1,
    totalXp: 0,
    currentLevelXp: 0,
    xpNeededForNextLevel: 100,
    progressPercent: 0,
  })

  useEffect(() => {
    setHebrewDate(
      new Intl.DateTimeFormat('he-IL', {
        timeZone: 'Asia/Jerusalem',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(new Date())
    )

    async function fetchData() {
      const [scoreRes, profileRes] = await Promise.all([
        fetch('/api/daily-score'),
        fetch('/api/player-profile'),
      ])
      const { score } = await scoreRes.json()
      const profileData = await profileRes.json()
      setDailyPct(score.maxXp > 0 ? Math.round((score.xp / score.maxXp) * 100) : 0)
      setProfile(profileData)
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header
      className="flex items-center gap-4 px-4 py-3 border-b"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <span className="text-sm shrink-0" style={{ color: 'var(--text-secondary)' }}>
        {hebrewDate}
      </span>
      <XPBar
        level={profile.level}
        totalXp={profile.totalXp}
        currentLevelXp={profile.currentLevelXp}
        xpNeededForNextLevel={profile.xpNeededForNextLevel}
        progressPercent={profile.progressPercent}
      />
      <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
        היום: {dailyPct}%
      </span>
    </header>
  )
}
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/XPBar.tsx src/components/TopBar.tsx
git commit -m "feat: update TopBar and XPBar to show level progression"
```

---

### Task 11: Update Morning Brief + remove old level utilities

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/lib/utils.ts`

Remove `getLevel`, `getLevelName`, `xpToNextLevel` from utils.ts (replaced by levelSystem.ts). Update page.tsx to use PlayerProfile + levelSystem, and add the active quests preview card.

- [ ] **Step 1: Remove deprecated functions from src/lib/utils.ts**

Delete the following three functions from `src/lib/utils.ts` (they are replaced by `src/lib/levelSystem.ts`):

```typescript
// DELETE these three functions:

// Level from total XP (every 500 XP = 1 level)
export function getLevel(totalXp: number): number {
  return Math.floor(totalXp / 500) + 1
}

// Trader-themed level names
export function getLevelName(level: number): string {
  if (level <= 5) return 'Rookie Trader'
  if (level <= 10) return 'Market Analyst'
  if (level <= 20) return 'Senior Trader'
  if (level <= 35) return 'Portfolio Manager'
  if (level <= 50) return 'Nostro Master'
  return 'Legend'
}

// XP to next level
export function xpToNextLevel(totalXp: number): { current: number; needed: number } {
  const level = getLevel(totalXp)
  const levelStartXp = (level - 1) * 500
  return { current: totalXp - levelStartXp, needed: 500 }
}
```

After deletion, `src/lib/utils.ts` should export only: `getTodayIST`, `getHebrewDate`, `getDayOfYear`, `xpForPriority`, `getWeekStartIST`, `addDaysToDate`, `lastNDays`, `getWeekKey`, `getMonthKey`.

- [ ] **Step 2: Replace src/app/page.tsx with the updated version**

```tsx
import { prisma } from '@/lib/prisma'
import { getTodayIST, getDayOfYear, getWeekKey, getMonthKey } from '@/lib/utils'
import { getOrCreateProfile } from '@/lib/playerProfile'
import { getXpProgress, getLevelName } from '@/lib/levelSystem'
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

  const [habits, tasks, score, quotes, goals, allScores, challenges, profile] = await Promise.all([
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
    getOrCreateProfile(),
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

  const xpProgress = getXpProgress(profile.totalXp)

  // Active quests preview (first 3 incomplete)
  const [activeQuestRows, winDays, tradingCheckins, fitnessCheckins] = await Promise.all([
    prisma.mainQuest.findMany({
      where: { completions: { none: {} } },
      take: 3,
      orderBy: { id: 'asc' },
    }),
    prisma.dailyScore.count({ where: { winDay: true } }),
    prisma.challengeLog.count({ where: { challenge: { category: 'trading' } } }),
    prisma.challengeLog.count({ where: { challenge: { category: 'fitness' } } }),
  ])

  const activeQuests = activeQuestRows.map((q) => {
    const req = JSON.parse(q.requirement) as { type: string; value: number }
    let current = 0
    if (req.type === 'win_days') current = winDays
    else if (req.type === 'trading_checkins') current = tradingCheckins
    else if (req.type === 'fitness_checkins') current = fitnessCheckins
    else if (req.type === 'level') current = xpProgress.level
    return {
      id: q.id,
      icon: q.icon,
      title: q.title,
      xpReward: q.xpReward,
      progress: Math.min(current, req.value),
      target: req.value,
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
    level: xpProgress.level,
    levelName: getLevelName(xpProgress.level),
    xpProgress,
    winRateMonth,
    challenges: challengesData,
    activeQuests,
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
          <span>{data.tasksDone}/{data.tasksToday} משימות היום הושלמו</span>
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

      {/* Active Quests Preview */}
      {data.activeQuests.length > 0 && (
        <div className="card p-5">
          <Link href="/quests">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                📜 Main Quests
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--accent-purple)' }}>הכל ›</span>
            </div>
          </Link>
          <div className="space-y-2">
            {data.activeQuests.map((q) => (
              <Link key={q.id} href="/quests">
                <div
                  className="flex items-center gap-3 p-2 rounded-lg"
                  style={{ background: 'var(--bg-card-hover)', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{q.icon}</span>
                  <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                    {q.title}
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
                        width: `${Math.min(q.progress / q.target, 1) * 100}%`,
                        background: 'var(--accent-purple)',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      minWidth: '36px',
                      textAlign: 'right',
                    }}
                  >
                    {q.progress}/{q.target}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StreakBadge streak={data.streak} />
        <StatCard
          icon="⚡"
          value={`${data.score.xp}`}
          label="XP היום"
          color="var(--accent-gold)"
        />
        <StatCard
          icon="🏆"
          value={`Lv.${data.level}`}
          label={data.levelName}
          color="var(--accent-purple)"
          progress={{
            current: data.xpProgress.currentLevelXp,
            max: data.xpProgress.xpNeededForNextLevel,
          }}
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
  progress,
}: {
  icon: string
  value: string
  label: string
  color: string
  progress?: { current: number; max: number }
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
      {progress && (
        <div
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.1)',
            overflow: 'hidden',
            marginTop: '4px',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, progress.max > 0 ? (progress.current / progress.max) * 100 : 0)}%`,
              background: color,
              borderRadius: '2px',
              transition: 'width 300ms',
            }}
          />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: TypeScript check — verify nothing else imports the removed utils functions**

```bash
npx tsc --noEmit 2>&1 | head -30
```

If errors mention `getLevel`, `getLevelName`, or `xpToNextLevel` imported elsewhere, fix those imports to use `src/lib/levelSystem.ts` instead.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/lib/utils.ts
git commit -m "feat: update Morning Brief to use PlayerProfile level + add active quests preview"
```

---

### Task 12: Add Quests to navigation

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/MobileNav.tsx`

- [ ] **Step 1: Add Quests item to Sidebar navItems array**

In `src/components/Sidebar.tsx`, replace the `navItems` array with:

```typescript
const navItems = [
  { href: '/', icon: '🌅', label: 'Morning Brief' },
  { href: '/tasks', icon: '✅', label: 'Tasks' },
  { href: '/schedule', icon: '📅', label: 'Schedule' },
  { href: '/challenges', icon: '⚡', label: 'Challenges' },
  { href: '/quests', icon: '📜', label: 'Quests' },
  { href: '/goals', icon: '🎯', label: 'Goals' },
  { href: '/habits', icon: '🔥', label: 'Habits' },
  { href: '/stats', icon: '📊', label: 'Stats' },
]
```

- [ ] **Step 2: Add Quests item to MobileNav navItems array**

In `src/components/MobileNav.tsx`, replace the `navItems` array with:

```typescript
const navItems = [
  { href: '/', icon: '🌅', label: 'Brief' },
  { href: '/tasks', icon: '✅', label: 'Tasks' },
  { href: '/schedule', icon: '📅', label: 'Schedule' },
  { href: '/challenges', icon: '⚡', label: 'Challenges' },
  { href: '/quests', icon: '📜', label: 'Quests' },
  { href: '/goals', icon: '🎯', label: 'Goals' },
  { href: '/habits', icon: '🔥', label: 'Habits' },
  { href: '/stats', icon: '📊', label: 'Stats' },
]
```

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/Sidebar.tsx src/components/MobileNav.tsx
git commit -m "feat: add Quests nav item to Sidebar and MobileNav"
```
