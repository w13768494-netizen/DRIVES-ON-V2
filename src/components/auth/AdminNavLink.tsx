'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSession } from '@/services/currentSessionService'

interface Props {
  href:     string
  icon:     React.ReactNode
  children: React.ReactNode
}

export function AdminNavLink({ href, icon, children }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const role = getSession()?.companyRole
    setVisible(role === 'admin' || role === 'superviseur')
  }, [])

  if (!visible) return null

  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
    >
      {icon}
      {children}
    </Link>
  )
}
