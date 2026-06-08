'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavLinkProps {
  href: string
  icon: string
  label: string
}

export default function NavLink({ href, icon, label }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
      style={{
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        background: isActive ? 'var(--bg-card-hover)' : 'transparent',
        borderLeft: isActive ? '2px solid var(--accent-purple)' : '2px solid transparent',
      }}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
