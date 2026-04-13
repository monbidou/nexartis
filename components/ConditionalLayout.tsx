'use client'

import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

const HIDDEN_ROUTES = ['/dashboard', '/onboarding', '/login', '/register', '/auth', '/signer']

export default function ConditionalLayout({
  header,
  footer,
  children,
}: {
  header: ReactNode
  footer: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname()
  const isHidden = HIDDEN_ROUTES.some(route => pathname.startsWith(route))

  return (
    <>
      {!isHidden && header}
      <main>{children}</main>
      {!isHidden && footer}
    </>
  )
}
