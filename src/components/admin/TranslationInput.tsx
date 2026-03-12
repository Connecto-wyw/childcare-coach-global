'use client'

import { useState, useEffect } from 'react'

export type I18nValues = {
  en: string
  ko: string
  id: string
  ms: string
  th: string
}

type Props = {
  label: string
  baseString: string | null | undefined
  i18nData: any // from DB row
  isTextArea?: boolean
  onChange: (enValue: string, translatedJsonb: I18nValues) => void
  disabled?: boolean
  maxLengthHint?: string
}

export default function TranslationInput({
  label,
  baseString,
  i18nData,
  isTextArea = false,
  onChange,
  disabled = false,
  maxLengthHint,
}: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [err, setErr] = useState('')

  const [vals, setVals] = useState<I18nValues>({
    en: '',
    ko: '',
    id: '',
    ms: '',
    th: '',
  })

  // ✅ Legacy Row Seeding & Init
  // If no i18n data exists, we seed the EN value from the baseString
  useEffect(() => {
    setVals({
      en: typeof i18nData?.en === 'string' ? i18nData.en : (baseString ?? ''),
      ko: typeof i18nData?.ko === 'string' ? i18nData.ko : '',
      id: typeof i18nData?.id === 'string' ? i18nData.id : '',
      ms: typeof i18nData?.ms === 'string' ? i18nData.ms : '',
      th: typeof i18nData?.th === 'string' ? i18nData.th : '',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseString, i18nData])

  const notifyChange = (newVals: I18nValues) => {
    // Sync EN to the base string exactly as requested by user rule #4
    onChange(newVals.en, newVals)
  }

  const handleUpdate = (lang: keyof I18nValues, val: string) => {
    const obj = { ...vals, [lang]: val }
    setVals(obj)
    notifyChange(obj)
  }

  const handleAutoTranslate = async () => {
    const sourceText = vals.en.trim()
    if (!sourceText) return

    setTranslating(true)
    setErr('')

    try {
      const res = await fetch('/api/admin/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sourceText }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.details || 'Translation failed')
      }

      // ✅ Overwrite ID, MS, TH with API defaults
      const merged = { ...vals, id: data.id, ms: data.ms, th: data.th }
      setVals(merged)
      notifyChange(merged)
      setIsOpen(true) // Open to show new translations
      
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setTranslating(false)
    }
  }

  const enIsEmpty = vals.en.trim().length === 0
  const isTooLongWarning = vals.en.length > 4000

  const InputFrame = isTextArea ? 'textarea' : 'input'
  const inputProps = isTextArea ? { className: 'w-full p-2 h-32 bg-gray-800 text-white rounded outline-none border border-transparent focus:border-blue-500 disabled:opacity-60' } : { className: 'w-full p-2 bg-gray-800 text-white rounded outline-none border border-transparent focus:border-blue-500 disabled:opacity-60' }

  return (
    <div className="mb-4 bg-[#2a2a2a] border border-[#444] p-4 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-semibold text-gray-200">{label}</label>
        <button
          type="button"
          onClick={handleAutoTranslate}
          disabled={disabled || enIsEmpty || translating}
          className="px-3 py-1.5 bg-[#9F1D23] text-white text-xs font-semibold rounded hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
        >
          {translating ? '⏳ Translating...' : '🌎 Auto Translate from EN'}
        </button>
      </div>

      {maxLengthHint && <p className="text-xs text-yellow-400 mb-2">{maxLengthHint}</p>}
      {err && <p className="text-xs text-red-400 mb-2">{err}</p>}
      {isTooLongWarning && <p className="text-xs text-orange-400 mb-2">Warning: Source text is very long. Auto-translate might fail if it exceeds limits, and Markdown structures require careful review.</p>}

      {/* Main English Source */}
      <div className="mb-2">
        <div className="text-xs text-gray-400 mb-1 flex items-center gap-1 font-mono">
          <span className="bg-blue-900/50 text-blue-300 px-1.5 rounded">EN</span> English (Base Source)
        </div>
        <InputFrame
          {...inputProps}
          value={vals.en}
          onChange={(e) => handleUpdate('en', e.target.value)}
          disabled={disabled}
          placeholder="English content..."
        />
      </div>

      <div className="mb-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          {isOpen ? '▼ Hide localized versions' : '▶ Show localized versions (KO, ID, MS, TH)'}
        </button>
      </div>

      {/* Expandable Regional Inputs */}
      {isOpen && (
        <div className="space-y-3 mt-4 border-t border-[#444] pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          
          <div className="md:col-span-2">
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1 font-mono">
              <span className="bg-green-900/50 text-green-300 px-1.5 rounded">KO</span> Korean (Manual)
            </div>
            <InputFrame
              {...inputProps}
              value={vals.ko}
              onChange={(e) => handleUpdate('ko', e.target.value)}
              disabled={disabled}
              placeholder="Korean content..."
            />
          </div>

          <div>
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1 font-mono">
              <span className="bg-purple-900/50 text-purple-300 px-1.5 rounded">ID</span> Indonesian
            </div>
            <InputFrame
              {...inputProps}
              value={vals.id}
              onChange={(e) => handleUpdate('id', e.target.value)}
              disabled={disabled}
              placeholder="Indonesian content..."
            />
          </div>

          <div>
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1 font-mono">
              <span className="bg-teal-900/50 text-teal-300 px-1.5 rounded">MS</span> Malay
            </div>
            <InputFrame
              {...inputProps}
              value={vals.ms}
              onChange={(e) => handleUpdate('ms', e.target.value)}
              disabled={disabled}
              placeholder="Malay content..."
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-gray-400 mb-1 flex items-center gap-1 font-mono">
              <span className="bg-orange-900/50 text-orange-300 px-1.5 rounded">TH</span> Thai
            </div>
            <InputFrame
              {...inputProps}
              value={vals.th}
              onChange={(e) => handleUpdate('th', e.target.value)}
              disabled={disabled}
              placeholder="Thai content..."
            />
          </div>

        </div>
      )}
    </div>
  )
}
