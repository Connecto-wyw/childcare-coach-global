import { supabase } from '@/lib/supabaseClient'
import { Metadata } from 'next'

// ✅ 타입 명시 없이 동작시키는 공식 방식
export default async function Page(props: any) {
  const { params } = props

  const { data, error } = await supabase
    .from('news')
    .select('id, title, content, created_at')
    .eq('id', params.id)
    .single()

  if (error || !data) {
    return <div className="p-4 text-red-400">뉴스를 불러오지 못했습니다.</div>
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] font-sans">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-4">{data.title}</h1>
        <p className="text-sm text-gray-400 text-right mb-6">
          {new Date(data.created_at).toLocaleDateString()}
        </p>
        <div className="whitespace-pre-wrap text-base text-gray-100">
          {data.content}
        </div>
      </div>
    </main>
  )
}
