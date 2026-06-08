'use client'

interface XPBarProps {
  xp: number
  maxXp: number
}

export default function XPBar({ xp, maxXp }: XPBarProps) {
  const pct = maxXp > 0 ? Math.min(100, Math.round((xp / maxXp) * 100)) : 0

  return (
    <div className="flex items-center gap-3 flex-1">
      <span className="text-xs font-medium shrink-0" style={{ color: 'var(--accent-gold)' }}>
        ⚡ {xp} XP
      </span>
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--accent-purple), var(--accent-gold))',
          }}
        />
      </div>
      <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
        {pct}%
      </span>
    </div>
  )
}
