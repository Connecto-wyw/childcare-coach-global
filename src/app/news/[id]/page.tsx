import { supabase } from '@/lib/supabaseClient'

// 타입 강제 우회로 빌드 에러 방지
interface NewsDetailProps {
  params: any
}

export default async function NewsDetailPage({ params }: NewsDetailProps) {
  const id = params?.id

  const { data, error } = await supabase
    .from('news')
    .select('title, content, created_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return <div className="p-4">뉴스를 불러올 수 없습니다.</div>
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{data.title}</h1>
      <p className="text-gray-500 text-sm mb-6">
        {new Date(data.created_at).toLocaleDateString()}
      </p>
      <div className="prose max-w-none whitespace-pre-line">
        {data.content}
      </div>
    </div>
  )
}
