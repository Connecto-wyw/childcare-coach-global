import { supabase } from '@/lib/supabaseClient'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function Page(props: any) {
  const slug = props.params?.slug

  const { data } = await supabase
    .from('news_posts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!data) {
    return <div className="p-4 text-red-400">뉴스를 찾을 수 없습니다.</div>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-4">{data.title}</h1>
      <p className="text-sm text-gray-400 text-right mb-6">
        {new Date(data.created_at).toLocaleDateString()}
      </p>
      <div className="whitespace-pre-wrap text-base text-gray-100">{data.content}</div>
    </div>
  )
}
