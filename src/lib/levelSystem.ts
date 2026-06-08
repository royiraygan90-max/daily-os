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
