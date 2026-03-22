import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const status = token.subscriptionStatus as string | undefined
  const expiresAt = token.subscriptionExpiresAt as string | null | undefined

  const isActive =
    status === 'active' &&
    expiresAt != null &&
    new Date(expiresAt) > new Date()

  if (!isActive) {
    return NextResponse.redirect(new URL('/assinar', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
