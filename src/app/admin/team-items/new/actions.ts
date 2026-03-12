'use server'

import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/adminguard'

export async function createTeamItemAction(formData: FormData) {
  const { ok, supabase } = await requireAdmin()
  if (!ok) redirect('/')

  const sb = supabase

  const title = String(formData.get('title') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim()
  if (!title || !slug) throw new Error('title/slug required')

  const titleI18nRaw = String(formData.get('title_i18n') ?? '')
  const title_i18n = titleI18nRaw !== 'null' ? JSON.parse(titleI18nRaw) : null
  
  const descI18nRaw = String(formData.get('description_i18n') ?? '')
  const description_i18n = descI18nRaw !== 'null' ? JSON.parse(descI18nRaw) : null
  
  const detailI18nRaw = String(formData.get('detail_markdown_i18n') ?? '')
  const detail_markdown_i18n = detailI18nRaw !== 'null' ? JSON.parse(detailI18nRaw) : null

  const description = String(formData.get('description') ?? '').trim() || null
  const cover_image_url = String(formData.get('cover_image_url') ?? '').trim() || null
  const detail_markdown = String(formData.get('detail_markdown') ?? '').trim() || null

  const tags = String(formData.get('tags') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const gallery_urls = String(formData.get('gallery_urls') ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)

  // Use 'any' to bypass TS strict linting during the migration phase before `_i18n` columns are typed in Database
  const payload: any = {
    title,
    title_i18n,
    slug,
    description,
    description_i18n,
    cover_image_url,
    detail_markdown,
    detail_markdown_i18n,
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
    .insert([payload])
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  // Fix the typo "team-itemss" that existed in the codebase
  redirect(`/admin/team-items/${data.id}`)
}
