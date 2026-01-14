'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuthUser } from '@/app/providers'
import type { User } from '@supabase/supabase-js'

type Team = {
  id: string
  owner_id: string
  name: string
  description: string | null
  region: string | null
  created_at: string
}

function getRedirectTo() {
  if (typeof window === 'undefined') return undefined
  return window.location.origin + '/auth/callback'
}

function getUserLabel(user: User) {
  const md = (user.user_metadata ?? {}) as Record<string, any>
  return (
    md.full_name ||
    md.name ||
    (user.email ? String(user.email).split('@')[0] : null) ||
    user.id.slice(0, 8)
  )
}

export default function TeamListPage() {
  const { user, loading: authLoading } = useAuthUser()

  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  // 로그인 유도 팝업
  const [showLoginModal, setShowLoginModal] = useState(false)

  // 팀 생성 모달
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [region, setRegion] = useState('')
  const [description, setDescription] = useState('')

  // 가입 처리
  const [joiningId, setJoiningId] = useState<string | null>(null)

  const userLabel = useMemo(() => (user ? getUserLabel(user) : ''), [user])

  const fetchTeams = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('teams')
      .select('id, owner_id, name, description, region, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('fetchTeams error', error)
      setTeams([])
      setLoading(false)
      return
    }

    setTeams((data ?? []) as Team[])
    setLoading(false)
  }

  // ✅ 로그인 여부와 상관없이 팀 리스트는 보여야 함(= RLS에서 anon select 허용되어야 함)
  useEffect(() => {
    fetchTeams()
  }, [])

  const startGoogleLogin = async () => {
    const redirectTo = getRedirectTo()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: redirectTo ? { redirectTo } : undefined,
    })
    if (error) {
      alert(error.message)
      console.error(error)
    }
  }

  const requireLoginThen = (action: () => void) => {
    if (!user) {
      setShowLoginModal(true)
      return
    }
    action()
  }

  const onClickCreateTeam = () => {
    requireLoginThen(() => setShowCreateModal(true))
  }

  const createTeam = async () => {
    if (!user) return

    if (!name.trim()) {
      alert('팀 이름을 입력해줘.')
      return
    }

    setCreating(true)

    // 1) teams insert
    const { data: teamRow, error: teamErr } = await supabase
      .from('teams')
      .insert([
        {
          owner_id: user.id,
          name: name.trim(),
          region: region.trim() ? region.trim() : null,
          description: description.trim() ? description.trim() : null,
        },
      ])
      .select('id')
      .single()

    if (teamErr || !teamRow?.id) {
      setCreating(false)
      alert(teamErr?.message ?? '팀 생성 실패')
      console.error(teamErr)
      return
    }

    const newTeamId = teamRow.id as string

    // 2) team_members에 owner로 가입 처리(선택이지만 추천)
    const { error: memErr } = await supabase.from('team_members').insert([
      {
        team_id: newTeamId,
        user_id: user.id,
        role: 'owner',
      },
    ])

    if (memErr) {
      // 멤버 insert 실패해도 팀은 만들어졌으니 치명 에러로 막진 않음
      console.error(memErr)
    }

    setCreating(false)
    setShowCreateModal(false)
    setName('')
    setRegion('')
    setDescription('')
    await fetchTeams()
  }

  const joinTeam = async (teamId: string) => {
    requireLoginThen(async () => {
      if (!user) return
      setJoiningId(teamId)

      const { error } = await supabase.from('team_members').insert([
        {
          team_id: teamId,
          user_id: user.id,
          role: 'member',
        },
      ])

      setJoiningId(null)

      if (error) {
        alert(error.message)
        console.error(error)
        return
      }

      alert('TEAM 가입 완료')
    })
  }

  // ✅ “팀 선택”을 무엇으로 정의할지 애매하면,
  // 지금은 “상세 진입”도 액션으로 보고 로그인 유도할 수도 있음.
  // 요구사항에 맞춰: 리스트는 보이되, 클릭해서 들어가려면 로그인 팝업.
  const openTeamDetail = (teamId: string) => {
    requireLoginThen(() => {
      window.location.href = `/team/${teamId}`
    })
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">TEAM</h1>

          {/* ✅ 팀 생성 버튼은 항상 보이되, 클릭 시 로그인 유도 */}
          <button
            onClick={onClickCreateTeam}
            className="px-4 py-2 bg-[#9F1D23] text-white rounded hover:opacity-90"
          >
            팀 생성
          </button>
        </div>

        {/* authLoading일 때도 리스트는 보여줄 수 있음(선택).
            여기서는 authLoading은 화면 막지 않고, 액션에서만 체크 */}
        {loading ? (
          <p className="text-gray-400 mt-6">불러오는 중…</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-400 mt-6">등록된 TEAM이 없습니다.</p>
        ) : (
          <ul className="space-y-4 mt-6">
            {teams.map((t) => (
              <li key={t.id} className="rounded-lg bg-[#222] p-4 border border-gray-700">
                {/* 제목 클릭 = 팀 선택(상세 진입) → 로그인 필요 */}
                <div
                  className="text-lg text-[#3EB6F1] hover:underline cursor-pointer"
                  onClick={() => openTeamDetail(t.id)}
                >
                  {t.name}
                </div>

                <div className="text-sm text-gray-400 mt-1">
                  {t.region ? `지역: ${t.region}` : '지역 미설정'}
                </div>

                {t.description ? (
                  <div className="text-sm text-gray-300 mt-2 whitespace-pre-wrap">
                    {t.description}
                  </div>
                ) : null}

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => joinTeam(t.id)}
                    disabled={joiningId === t.id}
                    className="px-4 py-2 bg-[#3EB6F1] text-black rounded hover:opacity-90 disabled:opacity-50"
                  >
                    {joiningId === t.id ? '처리 중…' : '팀 선택'}
                  </button>
                </div>

                {/* 디버그/확인용 표시가 필요하면 여기서만 최소로(지금은 제거 요청이라 안 넣음) */}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* =========================
          로그인 유도 모달 (coach 스타일: “계속하려면 로그인”)
         ========================= */}
      {showLoginModal && (
        <>
          <div
            className="fixed inset-0 bg-opacity-60"
            style={{ backgroundColor: '#282828' }}
            onClick={() => setShowLoginModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-[#222] rounded-lg p-6 w-full max-w-md border border-gray-700">
              <h2 className="text-2xl font-semibold mb-2 text-white">로그인이 필요해</h2>
              <p className="text-gray-300 mb-6">
                TEAM 기능은 로그인 후 사용할 수 있어.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="px-4 py-2 bg-gray-600 rounded text-white hover:opacity-80"
                >
                  닫기
                </button>
                <button
                  onClick={startGoogleLogin}
                  className="px-4 py-2 bg-[#3EB6F1] rounded text-black hover:opacity-90"
                >
                  Google로 로그인
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* =========================
          팀 생성 모달 (로그인 된 상태에서만 열림)
         ========================= */}
      {showCreateModal && (
        <>
          <div
            className="fixed inset-0 bg-opacity-60"
            style={{ backgroundColor: '#282828' }}
            onClick={() => setShowCreateModal(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-[#222] rounded-lg p-6 w-full max-w-md border border-gray-700">
              <h2 className="text-2xl font-semibold mb-4 text-white">팀 생성</h2>

              <input
                type="text"
                placeholder="팀 이름 (필수)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 mb-3 rounded bg-[#444] text-white placeholder-gray-400"
              />

              <input
                type="text"
                placeholder="지역 (예: 성남/판교/평촌)"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full p-2 mb-3 rounded bg-[#444] text-white placeholder-gray-400"
              />

              <textarea
                placeholder="팀 설명"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full p-2 mb-4 rounded bg-[#444] text-white placeholder-gray-400 resize-none h-28"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-600 rounded text-white hover:opacity-80"
                >
                  취소
                </button>
                <button
                  onClick={createTeam}
                  disabled={creating}
                  className="px-4 py-2 bg-[#9F1D23] rounded text-white hover:opacity-90 disabled:opacity-50"
                >
                  {creating ? '생성 중…' : '생성'}
                </button>
              </div>

              {/* 로그인 확인 텍스트는 모달 내부에도 굳이 안 넣었고,
                 필요하면 아래처럼 최소 표시 가능 */}
              {/* <div className="text-xs text-gray-500 mt-3">로그인: {user ? userLabel : '-'}</div> */}
            </div>
          </div>
        </>
      )}
    </main>
  )
}
