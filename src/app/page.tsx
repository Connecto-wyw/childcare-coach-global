// src/app/page.tsx
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function Page() {
  // redirect('/coach')
  return <div>Root Page. If you see this, Supabase might be falling back to the Site URL.</div>
}
