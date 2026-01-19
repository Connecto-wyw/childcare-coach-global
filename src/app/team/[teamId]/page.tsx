// src/app/team/[teamId]/page.tsx
import { notFound } from 'next/navigation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function safeJson(res: Response) {
  const text = await res.text()
  try {
    return { ok: true, json: JSON.parse(text), text }
  } catch {
    return { ok: false, json: null, text }
  }
}

export default async function TeamDetailPage({
  params,
}: {
  params: { teamId?: string }
}) {
  const teamId = params?.teamId

  // ✅ 여기서 teamId 없으면 라우팅 문제니까 바로 노출
  if (!teamId) {
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900 }}>TEAM PARAMS ERROR</h1>
        <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
          {JSON.stringify({ params }, null, 2)}
        </pre>
      </main>
    )
  }

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
              NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey ? 'present' : null,
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

  const parsed = await safeJson(res)

  if (!res.ok) {
    // ✅ notFound로 숨기지 말고 화면에 에러를 보여줌 (배포 안정화용)
    return (
      <main style={{ padding: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 900 }}>SUPABASE REST ERROR</h1>
        <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(
            {
              status: res.status,
              statusText: res.statusText,
              url,
              body: parsed.text,
            },
            null,
            2
          )}
        </pre>
      </main>
    )
  }

  // PostgREST는 배열로 줌
  const rows = Array.isArray(parsed.json) ? parsed.json : []
  const team = rows[0] ?? null

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
