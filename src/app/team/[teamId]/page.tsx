// src/app/team/[teamId]/page.tsx
import Link from 'next/link'
import { cookies, headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import ShareButtonClient from './ShareButtonClient'
import JoinButtonClient from './JoinButtonClient'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

type TeamRow = Pick<
  Database['public']['Tables']['teams']['Row'],
  'id' | 'name' | 'purpose' | 'image_url' | 'tag1' | 'tag2' | 'created_at'
> & {
  detail_image_url: string | null
  detail_markdown: string | null
}

async function createSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) throw new Error('Missing Supabase env')

  const cookieStore = await cookies()

  return createServerClient<Database>(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {}
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 })
        } catch {}
      },
    },
  })
}

async function resolveTeamId(paramsObj: { teamId?: string } | undefined) {
  const raw = paramsObj?.teamId
  if (raw && raw !== 'undefined' && raw !== 'null') return raw

  const h = await headers()
  const candidate =
    h.get('x-original-url') ||
    h.get('x-invoke-path') ||
    h.get('x-rewrite-url') ||
    h.get('referer') ||
    ''

  const m = candidate.match(/\/team\/([^/?#]+)/)
  return m?.[1] ?? ''
}

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>
}) {
  const sb = await createSupabaseServer()
  const p = await params
  const teamId = await resolveTeamId(p)

  if (!teamId) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-[24px] font-semibold">TEAM route params missing</h1>
        </div>
      </main>
    )
  }

  const { data: team } = await sb
    .from('teams')
    .select('id,name,purpose,image_url,tag1,tag2,detail_image_url,detail_markdown')
    .eq('id', teamId)
    .maybeSingle()

  if (!team) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-[24px] font-semibold">Team not found</h1>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white text-[#0e0e0e]">
      <div className="mx-auto max-w-4xl px-4 py-10">

        {/* 제목 */}
        <h1 className="text-[28px] font-semibold">{team.name}</h1>

        {/* 설명 */}
        <p className="mt-4 text-[16px] text-[#555]">
          {team.purpose}
        </p>

        {/* 상세 섹션 */}
        <div className="mt-10 rounded-2xl border border-[#e9e9e9] bg-white p-6">

          <h2 className="text-[18px] font-semibold">Details</h2>

          {team.detail_image_url && (
            <img
              src={team.detail_image_url}
              alt="detail"
              className="mt-4 w-full rounded-2xl"
            />
          )}

          <div className="mt-6 prose max-w-none prose-p:my-2 prose-li:my-1 prose-headings:mt-4 prose-headings:mb-2">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              components={{
                p: ({ children }) => (
                  <p style={{ whiteSpace: 'pre-wrap' }}>{children}</p>
                ),
              }}
            >
              {team.detail_markdown || 'No additional details yet.'}
            </ReactMarkdown>
          </div>

        </div>

        {/* 뒤로가기 */}
        <div className="mt-10">
          <Link href="/team" className="text-[#3497f3] hover:underline">
            Back to TEAM →
          </Link>
        </div>

      </div>
    </main>
  )
}
