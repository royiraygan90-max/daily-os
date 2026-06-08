// Israel timezone date string "YYYY-MM-DD"
export function getTodayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date())
}

// Hebrew date display: "יום שני, 8 ביוני 2026"
export function getHebrewDate(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr + 'T00:00:00') : new Date()
  return new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

// Day of year (1-365) for quote rotation
export function getDayOfYear(): number {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }))
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// XP value by priority
export function xpForPriority(priority: string): number {
  return ({ urgent: 30, high: 20, medium: 15, low: 10 } as Record<string, number>)[priority] ?? 15
}

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

// Last N days as "YYYY-MM-DD" array (inclusive, newest last)
export function lastNDays(n: number): string[] {
  const dates: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(d))
  }
  return dates
}
