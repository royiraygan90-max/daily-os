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
