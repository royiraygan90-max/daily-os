'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, TasksIcon, GoalsIcon, ChallengesIcon, ScheduleIcon } from './icons'

const navItems = [
  { href: '/', icon: HomeIcon, label: 'בית' },
  { href: '/tasks', icon: TasksIcon, label: 'משימות' },
  { href: '/goals', icon: GoalsIcon, label: 'מטרות' },
  { href: '/challenges', icon: ChallengesIcon, label: 'אתגרים' },
  { href: '/schedule', icon: ScheduleIcon, label: 'יומן' },
]

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around items-center"
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
        zIndex: 50,
        padding: '9px 6px calc(20px + env(safe-area-inset-bottom))',
      }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center gap-[3px]"
            style={{ color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)', textDecoration: 'none' }}
          >
            <Icon size={19} color={isActive ? 'var(--accent-gold)' : 'var(--text-secondary)'} />
            <div style={{ fontSize: 9.5, fontWeight: item.href === '/' ? 600 : 400 }}>{item.label}</div>
          </Link>
        )
      })}
    </nav>
  )
}
