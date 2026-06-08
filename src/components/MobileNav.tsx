'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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

export default function MobileNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t flex"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', zIndex: 50 }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 py-2 text-xs gap-0.5 transition-colors"
            style={{ color: isActive ? 'var(--accent-purple)' : 'var(--text-secondary)' }}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
