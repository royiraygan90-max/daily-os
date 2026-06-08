import NavLink from './NavLink'

const navItems = [
  { href: '/', icon: '🌅', label: 'Morning Brief' },
  { href: '/tasks', icon: '✅', label: 'Tasks' },
  { href: '/schedule', icon: '📅', label: 'Schedule' },
  { href: '/challenges', icon: '⚡', label: 'Challenges' },
  { href: '/quests', icon: '📜', label: 'Quests' },
  { href: '/goals', icon: '🎯', label: 'Goals' },
  { href: '/habits', icon: '🔥', label: 'Habits' },
  { href: '/stats', icon: '📊', label: 'Stats' },
]

export default function Sidebar() {
  return (
    <aside
      className="hidden md:flex flex-col w-60 min-h-screen shrink-0 border-r"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          ⚡ Daily OS
        </span>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </nav>

      <div className="p-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
        Level up every day ⚡
      </div>
    </aside>
  )
}
