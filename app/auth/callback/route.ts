import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const redirectUrl = new URL(next, origin)
      const response = NextResponse.redirect(redirectUrl)
      // Force no-cache to ensure middleware picks up the new session
      response.headers.set('Cache-Control', 'no-store, max-age=0')
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
