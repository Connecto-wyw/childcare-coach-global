'use client'

import React, { createContext, useContext } from 'react'

type CommonDictionary = {
  navbar: Record<string, string>
}

interface I18nContextProps {
  locale: string
  dictionary: CommonDictionary
}

const I18nContext = createContext<I18nContextProps | undefined>(undefined)

export function I18nProvider({
  children,
  locale,
  dictionary,
}: {
  children: React.ReactNode
  locale: string
  dictionary: CommonDictionary
}) {
  return (
    <I18nContext.Provider value={{ locale, dictionary }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

export function useTranslation(namespace: keyof CommonDictionary) {
  const context = useI18n()
  
  return (key: string) => {
    return context.dictionary[namespace]?.[key] || key
  }
}
