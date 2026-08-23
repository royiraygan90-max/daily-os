'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

interface NavLinkProps {
  href: string
  label: string
  icon: ReactNode
}

export default function NavLink({ href, label, icon }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
      style={{
        color: isActive ? 'var(--accent-gold)' : 'var(--text-secondary)',
        background: isActive ? 'rgba(217,184,118,.12)' : 'transparent',
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
