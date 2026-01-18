import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminguard'
import type { TablesInsert } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function createAction(formData: FormData) {
  'use server'

  const { ok, supabase } = await requireAdmin()
  if (!ok) redirect('/')

  // ✅ destructuring 이후 타입 유지(never 방지)
  const sb = supabase

  const title = String(formData.get('title') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim()
  if (!title || !slug) throw new Error('title/slug required')

  // ✅ 빈 문자열은 null로 바꾸는 게 DB에 더 안전
  const coverRaw = String(formData.get('cover_image_url') ?? '').trim()
  const detailRaw = String(formData.get('detail_markdown') ?? '').trim()

  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const gallery_urls = String(formData.get('gallery_urls') ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  // ✅ DB Insert 타입으로 payload 고정 (타입 에러 정리 핵심)
  const payload: TablesInsert<'team_items'> = {
    title,
    slug,
    description: String(formData.get('description') ?? '').trim() || null,
    cover_image_url: coverRaw || null,
    detail_markdown: detailRaw || null,
    tags: tags.length ? tags : null,
    gallery_urls: gallery_urls.length ? gallery_urls : null,

    base_price: Number(formData.get('base_price') ?? 10000),
    min_price: Number(formData.get('min_price') ?? 7000),
    discount_step_percent: Number(formData.get('discount_step_percent') ?? 1),
    discount_step_every: Number(formData.get('discount_step_every') ?? 10),
    max_discount_percent: Number(formData.get('max_discount_percent') ?? 30),
    is_active: formData.get('is_active') === 'on',
  }

 const { data, error } = await sb
  .from('team_items')
  .insert(payload)
  .select('id')
  .single()

  if (error) throw new Error(error.message)

  redirect(`/admin/team-items/${data.id}`)
}

export default async function NewTeamItemPage() {
  const { ok } = await requireAdmin()
  if (!ok) redirect('/')

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">New TEAM Item</h1>

        <form action={createAction} className="mt-6 grid gap-3">
          <input name="title" placeholder="Title" className="rounded-xl bg-white/10 p-3" />
          <input
            name="slug"
            placeholder="Slug (e.g. k-play-mat-team)"
            className="rounded-xl bg-white/10 p-3"
          />
          <input name="description" placeholder="Description" className="rounded-xl bg-white/10 p-3" />
          <input name="tags" placeholder="Tags (comma separated)" className="rounded-xl bg-white/10 p-3" />
          <input name="cover_image_url" placeholder="Cover image URL" className="rounded-xl bg-white/10 p-3" />

          <textarea
            name="gallery_urls"
            placeholder="Gallery URLs (one per line)"
            className="rounded-xl bg-white/10 p-3"
            rows={4}
          />
          <textarea
            name="detail_markdown"
            placeholder="Detail markdown"
            className="rounded-xl bg-white/10 p-3"
            rows={8}
          />

          <div className="grid grid-cols-2 gap-3">
            <input name="base_price" type="number" defaultValue={10000} className="rounded-xl bg-white/10 p-3" />
            <input name="min_price" type="number" defaultValue={7000} className="rounded-xl bg-white/10 p-3" />
            <input name="discount_step_percent" type="number" defaultValue={1} className="rounded-xl bg-white/10 p-3" />
            <input name="discount_step_every" type="number" defaultValue={10} className="rounded-xl bg-white/10 p-3" />
            <input name="max_discount_percent" type="number" defaultValue={30} className="rounded-xl bg-white/10 p-3" />
          </div>

          <label className="flex items-center gap-2 text-sm text-white/80">
            <input name="is_active" type="checkbox" defaultChecked />
            active
          </label>

          <button className="rounded-xl bg-[#3EB6F1] px-4 py-3 font-semibold text-black">
            Create
          </button>
        </form>
      </div>
    </div>
  )
}
