import NavLink from './NavLink'
import { HomeIcon, TasksIcon, ScheduleIcon, ChallengesIcon, QuestsIcon, GoalsIcon, HabitsIcon, StatsIcon } from './icons'

const navItems = [
  { href: '/', icon: HomeIcon, label: 'Morning Brief' },
  { href: '/tasks', icon: TasksIcon, label: 'משימות' },
  { href: '/habits', icon: HabitsIcon, label: 'הרגלים' },
  { href: '/goals', icon: GoalsIcon, label: 'מטרות' },
  { href: '/challenges', icon: ChallengesIcon, label: 'אתגרים' },
  { href: '/quests', icon: QuestsIcon, label: 'Quests' },
  { href: '/schedule', icon: ScheduleIcon, label: 'יומן' },
  { href: '/stats', icon: StatsIcon, label: 'סטטיסטיקות' },
]

export default function Sidebar() {
  return (
    <aside
      className="hidden md:flex flex-col w-60 min-h-screen shrink-0 border-l"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center gap-3 px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
        <div
          className="flex items-center justify-center flex-shrink-0 font-extrabold"
          style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#f0c674,#b8863b)', color: '#0a0a0c', fontSize: 17 }}
        >
          ⚡
        </div>
        <span className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Daily OS
        </span>
      </div>

      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map((item) => (
          <NavLink key={item.href} href={item.href} label={item.label} icon={<item.icon size={18} />} />
        ))}
      </nav>

      <div className="p-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
        Level up every day ⚡
      </div>
    </aside>
  )
}
