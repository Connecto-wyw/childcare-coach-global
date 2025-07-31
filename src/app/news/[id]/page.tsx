import { supabase } from '@/lib/supabaseClient'

// Next.js 15 호환용 직접 PageProps 타입 정의
type NewsDetailPageProps = {
  params: Promise<{ id: string }>
}

export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { id } = await params

  const { data, error } = await supabase
    .from('news')
    .select('title, content, created_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return (
      <main className="min-h-screen bg-[#333333] text-[#eae3de] p-6">
        뉴스를 불러올 수 없습니다.
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#333333] text-[#eae3de] p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">{data.title}</h1>
      <p className="text-gray-400 text-sm mb-8">
        {new Date(data.created_at).toLocaleDateString()}
      </p>
      <div className="prose max-w-none whitespace-pre-line">{data.content}</div>
    </main>
  )
}
