// src/lib/supabase/browser.ts
import { createBrowserClient } from '@supabase/ssr'

function serializeCookie(name: string, value: string, options: any = {}) {
  const enc = encodeURIComponent
  let cookie = `${name}=${enc(value)}`

  cookie += `; Path=${options.path ?? '/'}`
  if (options.maxAge != null) cookie += `; Max-Age=${options.maxAge}`
  if (options.expires) cookie += `; Expires=${new Date(options.expires).toUTCString()}`
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`
  if (options.secure) cookie += `; Secure`
  // httpOnly은 브라우저 JS에서 설정 불가(무시됨)

  return cookie
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof document === 'undefined') return undefined
          const match = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
          return match ? decodeURIComponent(match.split('=')[1] ?? '') : undefined
        },
        set(name: string, value: string, options: any) {
          if (typeof document === 'undefined') return
          document.cookie = serializeCookie(name, value, options)
        },
        remove(name: string, options: any) {
          if (typeof document === 'undefined') return
          document.cookie = serializeCookie(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )
}
