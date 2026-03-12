'use client'

import { redirect } from 'next/navigation'
import type { TablesInsert } from '@/lib/database.types'
import { useState } from 'react'
import TranslationInput, { I18nValues } from '@/components/admin/TranslationInput'
import { createTeamItemAction } from './actions' // We will extract the server action to a separate file to support 'use client'

export default function NewTeamItemPage() {
  const [title, setTitle] = useState('')
  const [titleI18n, setTitleI18n] = useState<I18nValues | null>(null)
  
  const [desc, setDesc] = useState('')
  const [descI18n, setDescI18n] = useState<I18nValues | null>(null)
  
  const [detail, setDetail] = useState('')
  const [detailI18n, setDetailI18n] = useState<I18nValues | null>(null)

  return (
    <div className="min-h-screen bg-[#111] text-white">
      <div className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold">New TEAM Item</h1>

        <form action={createTeamItemAction} className="mt-6 grid gap-4">
          {/* Hidden inputs payload for server action */}
          <input type="hidden" name="title" value={title} />
          <input type="hidden" name="title_i18n" value={JSON.stringify(titleI18n)} />
          
          <input type="hidden" name="description" value={desc} />
          <input type="hidden" name="description_i18n" value={JSON.stringify(descI18n)} />
          
          <input type="hidden" name="detail_markdown" value={detail} />
          <input type="hidden" name="detail_markdown_i18n" value={JSON.stringify(detailI18n)} />

          <TranslationInput
            label="Item Title"
            baseString=""
            i18nData={{}}
            onChange={(en, localized) => {
              setTitle(en)
              setTitleI18n(localized)
            }}
          />

          <input
            name="slug"
            placeholder="Slug (e.g. k-play-mat-team)"
            className="rounded-xl bg-white/10 p-3"
          />

          <TranslationInput
            label="Item Description"
            baseString=""
            i18nData={{}}
            onChange={(en, localized) => {
              setDesc(en)
              setDescI18n(localized)
            }}
          />
          <input name="tags" placeholder="Tags (comma separated)" className="rounded-xl bg-white/10 p-3" />
          <input name="cover_image_url" placeholder="Cover image URL" className="rounded-xl bg-white/10 p-3" />

          <textarea
            name="gallery_urls"
            placeholder="Gallery URLs (one per line)"
            className="rounded-xl bg-white/10 p-3"
            rows={4}
          />
          <TranslationInput
            label="Detail Markdown"
            baseString=""
            i18nData={{}}
            isTextArea
            maxLengthHint="Warning: Long markdown translated formatting must be checked."
            onChange={(en, localized) => {
              setDetail(en)
              setDetailI18n(localized)
            }}
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
