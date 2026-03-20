'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/app/providers'
import RichTextEditor from '@/app/admin/RichTextEditor'

export type ProgramFormData = {
  id?: string
  title: string
  thumbnail_url: string
  habit_type: string
  auth_method: string
  period_days: number | string
  auth_count: number | string
  weekly_max_count: number | string
  start_date: string
  end_date: string
  deposit: number | string
  basic_reward: number | string
  discount_rate: number | string
  bonus_reward: number | string
  guide_html: string
  is_active: boolean
}

const DEFAULT_FORM: ProgramFormData = {
  title: '',
  thumbnail_url: '',
  habit_type: 'daily',
  auth_method: 'photo',
  period_days: '',
  auth_count: '',
  weekly_max_count: 7,
  start_date: '',
  end_date: '',
  deposit: '',
  basic_reward: '',
  discount_rate: 0,
  bonus_reward: '',
  guide_html: '',
  is_active: true,
}

type Props = {
  initialData?: Partial<ProgramFormData>
  onSubmit: (data: ProgramFormData) => Promise<void>
}

export default function ProgramForm({ initialData, onSubmit }: Props) {
  const supabase = useSupabase()
  const router = useRouter()
  const [formData, setFormData] = useState<ProgramFormData>({
    ...DEFAULT_FORM,
    ...initialData,
  })
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const BUCKET = 'images' // Supabase storage bucket

  const handleChange = (field: keyof ProgramFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const fileName = `market_program_${Date.now()}.${ext}`
    const path = `programs/${fileName}`

    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: true,
    })

    if (upErr) {
      alert(`Upload failed: ${upErr.message}`)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    if (data?.publicUrl) {
      handleChange('thumbnail_url', data.publicUrl)
    }
    setUploading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onSubmit(formData)
    } catch (err: any) {
      alert(err.message || 'Error saving program')
    } finally {
      setSubmitting(false)
    }
  }

  const inputClass = 'rounded-xl bg-white/5 border border-white/10 p-3 w-full text-white placeholder:text-white/40 outline-none focus:border-[#3EB6F1] transition-colors'
  const labelClass = 'block text-sm font-semibold mb-2 text-white/80'

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      {/* Image Upload */}
      <div>
        <label className={labelClass}>해빗 썸네일 이미지 (Thumbnail)</label>
        <div 
          className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:bg-white/5 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          {formData.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={formData.thumbnail_url} alt="Thumbnail preview" className="mx-auto max-h-48 rounded-lg object-contain" />
          ) : (
            <div className="text-white/40">
              {uploading ? 'Uploading...' : 'Click to upload thumbnail image'}
            </div>
          )}
        </div>
        <input 
          type="file" 
          accept="image/*" 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleImageUpload} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={labelClass}>해빗 제목 (Title)</label>
          <input
            placeholder="Title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>해빗 타입 (Habit Type)</label>
          <select 
            value={formData.habit_type} 
            onChange={(e) => handleChange('habit_type', e.target.value)}
            className={inputClass}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>인증 방식 (Auth Method)</label>
          <select 
            value={formData.auth_method} 
            onChange={(e) => handleChange('auth_method', e.target.value)}
            className={inputClass}
          >
            <option value="photo">Photo</option>
            <option value="text">Text</option>
            <option value="both">Both</option>
          </select>
        </div>

        <div>
           <label className={labelClass}>해빗 기간 (Period - Days)</label>
           <input
             type="number"
             placeholder="e.g. 28"
             value={formData.period_days}
             onChange={(e) => handleChange('period_days', e.target.value)}
             className={inputClass}
             min="0"
           />
        </div>

        <div>
           <label className={labelClass}>인증 횟수 (Auth Count)</label>
           <input
             type="number"
             placeholder="Total authentications required"
             value={formData.auth_count}
             onChange={(e) => handleChange('auth_count', e.target.value)}
             className={inputClass}
             min="0"
           />
        </div>

        <div>
           <label className={labelClass}>주간 최대 횟수 (Weekly Max Frequency)</label>
           <select 
             value={formData.weekly_max_count} 
             onChange={(e) => handleChange('weekly_max_count', e.target.value)}
             className={inputClass}
           >
             <option value="1">1</option>
             <option value="2">2</option>
             <option value="3">3</option>
             <option value="5">5</option>
             <option value="7">7</option>
           </select>
        </div>

        <div>
           <label className={labelClass}>시작 기간 (Start Date)</label>
           <input
             type="date"
             value={formData.start_date}
             onChange={(e) => handleChange('start_date', e.target.value)}
             className={inputClass}
           />
        </div>

        <div>
           <label className={labelClass}>종료 기간 (End Date)</label>
           <input
             type="date"
             value={formData.end_date}
             onChange={(e) => handleChange('end_date', e.target.value)}
             className={inputClass}
           />
        </div>

        <div>
           <label className={labelClass}>예치금 (Deposit - number)</label>
           <input
             type="number"
             placeholder="e.g. 10000"
             value={formData.deposit}
             onChange={(e) => handleChange('deposit', e.target.value)}
             className={inputClass}
             min="0"
           />
        </div>

        <div>
           <label className={labelClass}>기본 보상 (Basic Reward - number)</label>
           <input
             type="number"
             placeholder="e.g. 1000"
             value={formData.basic_reward}
             onChange={(e) => handleChange('basic_reward', e.target.value)}
             className={inputClass}
             min="0"
           />
        </div>

        <div>
           <label className={labelClass}>할인율 % (Discount Rate)</label>
           <input
             type="number"
             placeholder="0 - 100"
             value={formData.discount_rate}
             onChange={(e) => handleChange('discount_rate', e.target.value)}
             className={inputClass}
             min="0"
             max="100"
           />
        </div>

        <div>
           <label className={labelClass}>보너스 보상 (Bonus Reward - number)</label>
           <input
             type="number"
             placeholder="e.g. 500"
             value={formData.bonus_reward}
             onChange={(e) => handleChange('bonus_reward', e.target.value)}
             className={inputClass}
             min="0"
           />
        </div>
      </div>

      <div>
        <label className={labelClass}>해빗 가이드 (Guide HTML)</label>
        <div className="bg-white rounded-xl">
          <RichTextEditor 
            value={formData.guide_html} 
            onChange={(html) => handleChange('guide_html', html)} 
            placeholder="해빗 가이드 내용을 입력해주세요..."
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer w-max">
        <input
          type="checkbox"
          checked={formData.is_active}
          onChange={(e) => handleChange('is_active', e.target.checked)}
          className="w-4 h-4"
        />
        Active / 활성화
      </label>

      <div className="flex gap-4 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-white flex-1 hover:bg-white/20 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || uploading}
          className="rounded-xl bg-[#3EB6F1] px-6 py-3 font-semibold text-black flex-1 disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          {submitting ? 'Saving...' : 'Save Program'}
        </button>
      </div>
    </form>
  )
}
