'use client'

interface DailyScoreRingProps {
  done: number
  total: number
  size?: number
}

export default function DailyScoreRing({ done, total, size = 80 }: DailyScoreRingProps) {
  const pct = total > 0 ? done / total : 0
  const r = (size - 10) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - pct)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--border)"
        strokeWidth={8}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={pct >= 0.8 ? 'var(--accent-gold)' : 'var(--accent-purple)'}
        strokeWidth={8}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 500ms ease' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        style={{
          transform: 'rotate(90deg)',
          transformOrigin: '50% 50%',
          fontSize: size * 0.22,
          fill: 'var(--text-primary)',
          fontWeight: 600,
        }}
      >
        {done}/{total}
      </text>
    </svg>
  )
}
