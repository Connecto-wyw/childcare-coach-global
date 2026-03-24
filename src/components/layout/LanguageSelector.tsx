'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useI18n, useTranslation } from '@/i18n/I18nProvider'

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
  { code: 'th', label: 'ภาษาไทย' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'vi', label: 'Tiếng Việt' },
]

export default function LanguageSelector() {
  const { locale } = useI18n()
  const t = useTranslation('common')
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0]

  const changeLanguage = (code: string) => {
    if (code === locale) {
      setIsOpen(false)
      return
    }
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000`
    window.location.reload()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isCoachPage = pathname === '/coach' || pathname === '/'

  return (
    <div 
      className={`w-full flex justify-center pt-8 mt-auto bg-[#fafafa] border-t border-[#f0f0f0] relative z-[60] ${isCoachPage ? 'pb-[calc(var(--chatbar-h,96px)+32px)]' : 'pb-8'}`}
    >
      <div className="flex flex-col items-center gap-2">
        <span className="text-[12px] text-[#8a8a8a] font-medium tracking-wide uppercase">
          {t('language')}
        </span>
        
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between w-[200px] px-4 py-2.5 bg-white border border-[#dcdcdc] rounded-xl text-[14px] font-medium text-[#0e0e0e] shadow-sm hover:border-[#b4b4b4] focus:outline-none focus:ring-2 focus:ring-[#3497f3] focus:border-transparent transition"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span>{activeLang.label}</span>
            <svg
              className={`w-4 h-4 ml-2 text-[#8a8a8a] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-full bg-white border border-[#e0e0e0] rounded-xl shadow-lg z-50 overflow-hidden transform origin-bottom">
              <ul className="py-1 max-h-60 overflow-auto" role="listbox">
                {LANGUAGES.map((lang) => (
                  <li key={lang.code} role="presentation">
                    <button
                      role="option"
                      aria-selected={lang.code === locale}
                      onClick={() => changeLanguage(lang.code)}
                      className={`w-full text-left px-4 py-2.5 text-[14px] transition-colors ${
                        lang.code === locale
                          ? 'bg-[#EAF6FF] text-[#3497f3] font-semibold'
                          : 'text-[#4a4a4a] hover:bg-[#fafafa]'
                      }`}
                    >
                      {lang.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
