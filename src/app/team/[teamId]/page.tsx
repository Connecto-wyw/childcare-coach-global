// src/app/team/[teamId]/page.tsx
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

function mask(v: string | undefined | null) {
  if (!v) return '(missing)'
  if (v.length <= 12) return '***'
  return `${v.slice(0, 6)}...${v.slice(-6)}`
}

function extractTeamIdFromText(text: string | null | undefined) {
  if (!text) return null
  const m = text.match(/\/team\/([0-9a-fA-F-]{36})/i)
  return m?.[1] ?? null
}

async function safeText(res: Response) {
  try {
    const t = await res.text()
    return t.length > 2000 ? t.slice(0, 2000) + '\n...<truncated>' : t
  } catch {
    return '(failed to read body)'
  }
}

export default async function TeamDetailPage({
  params,
}: {
  params: { teamId?: string }
}) {
  // ✅ Next 16: headers()는 Promise
  const h = await headers()

  // ✅ 1) Next params에서 먼저 시도
  let teamId = params?.teamId ?? null

  // ✅ 2) params가 비면, 헤더에서 URL을 찾아 teamId 추출
  if (!teamId) {
    const candidates = {
      'x-original-url': h.get('x-original-url'),
      'x-rewrite-url': h.get('x-rewrite-url'),
      'x-forwarded-uri': h.get('x-forwarded-uri'),
      'x-invoke-path': h.get('x-invoke-path'),
      'x-matched-path': h.get('x-matched-path'),
      referer: h.get('referer'),
    }

    teamId =
      extractTeamIdFromText(candidates['x-original-url']) ||
      extractTeamIdFromText(candidates['x-rewrite-url']) ||
      extractTeamIdFromText(candidates['x-forwarded-uri']) ||
      extractTeamIdFromText(candidates['x-invoke-path']) ||
      extractTeamIdFromText(candidates['x-matched-path']) ||
      extractTeamIdFromText(candidates.referer)

    if (!teamId) {
      return (
        <main style={{ padding: 16 }}>
          <h1 style={{ fontSize: 18, fontWeight: 900 }}>TEAM PARAMS STILL EMPTY</h1>
          <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(
  {
    params,
    candidates,
    note: 'No teamId found in params or headers. This indicates routing/rewrites issue.',
  },
  null,
  2
)}
          </pre>
        </main>
      )
    }
  }

  // ✅ 3) Supabase REST로 조회
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !anonKey) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900 }}>ENV ERROR</h1>
        <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(
  {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl ?? null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(anonKey),
  },
  null,
  2
)}
        </pre>
      </main>
    )
  }

  const url = `${supabaseUrl}/rest/v1/teams?id=eq.${encodeURIComponent(teamId)}&select=id,name,description,created_at`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await safeText(res)
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900 }}>SUPABASE REST ERROR</h1>
        <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(
  { teamId, status: res.status, statusText: res.statusText, body, url },
  null,
  2
)}
        </pre>
      </main>
    )
  }

  const rows = (await res.json()) as any[]
  const team = rows?.[0] ?? null
  if (!team) notFound()

  return (
    <main style={{ padding: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>{team.name ?? 'TEAM'}</h1>
      {team.description ? (
        <p style={{ marginTop: 8, lineHeight: 1.6 }}>{team.description}</p>
      ) : null}
      <p style={{ marginTop: 10, opacity: 0.7 }}>teamId: {team.id}</p>
    </main>
  )
}
