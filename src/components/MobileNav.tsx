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
      style={{
        background: 'var(--bg-card)',
        borderColor: 'var(--border)',
        zIndex: 50,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            title={item.label}
            className="flex items-center justify-center flex-1 py-3"
          >
            <span
              className="text-2xl leading-none flex items-center justify-center rounded-xl transition-all duration-200"
              style={{
                width: '44px',
                height: '36px',
                background: isActive ? 'rgba(59,130,246,0.18)' : 'transparent',
                transform: isActive ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              {item.icon}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
