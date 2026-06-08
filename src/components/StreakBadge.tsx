interface StreakBadgeProps {
  streak: number
}

export default function StreakBadge({ streak }: StreakBadgeProps) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}
    >
      <span className="text-xl">🔥</span>
      <div>
        <div className="text-lg font-bold" style={{ color: 'var(--accent-gold)' }}>
          {streak}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {streak === 1 ? 'יום רצף' : 'ימי רצף'}
        </div>
      </div>
    </div>
  )
}
