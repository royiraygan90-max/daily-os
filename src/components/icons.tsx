interface IconProps {
  size?: number
  color?: string
}

const base = (size: number, color: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: color,
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export function HomeIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-9z" />
    </svg>
  )
}

export function TasksIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  )
}

export function HabitsIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M12 22c4-1 8-5 8-11V6l-8-4-8 4v5c0 6 4 10 8 11z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

export function GoalsIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  )
}

export function ChallengesIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4a1 1 0 0 0-1 1c0 2 1 4 4 4M17 5h3a1 1 0 0 1 1 1c0 2-1 4-4 4" />
    </svg>
  )
}

export function QuestsIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M4 4h11l5 5v11H4z" />
      <path d="M8 12l2.5 2.5L16 9" />
    </svg>
  )
}

export function ScheduleIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  )
}

export function StatsIcon({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <rect x="4" y="12" width="4" height="8" />
      <rect x="10" y="7" width="4" height="13" />
      <rect x="16" y="3" width="4" height="17" />
    </svg>
  )
}

export function CheckIcon({ size = 14, color = '#0a0a0c' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  )
}

export function FlameIcon({ size = 15, color = '#d9b876' }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M12 2c1 3-3 4-3 8a3 3 0 0 0 6 0c0-1-1-2-1-3 2 1 3 4 3 6a5 5 0 0 1-10 0c0-5 3-6 5-11z" />
    </svg>
  )
}

export function BoltIcon({ size = 15, color = '#d9b876' }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  )
}

export function ShieldIcon({ size = 15, color = '#d9b876' }: IconProps) {
  return (
    <svg {...base(size, color)}>
      <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5l8-3z" />
    </svg>
  )
}

export function PinIcon({ size = 17, color = 'currentColor', fill = 'none' }: IconProps & { fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.9-6.3 3.9 1.7-7-5.4-4.7 7.1-.6z" />
    </svg>
  )
}
