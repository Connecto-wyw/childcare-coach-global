// src/components/admin/MarkdownEditor.tsx
'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  value: string
  onChange: (next: string) => void
  placeholder?: string
  minRows?: number
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function getLineStart(text: string, index: number) {
  const i = text.lastIndexOf('\n', index - 1)
  return i === -1 ? 0 : i + 1
}

function getLineEnd(text: string, index: number) {
  const i = text.indexOf('\n', index)
  return i === -1 ? text.length : i
}

export default function MarkdownEditor({ value, onChange, placeholder, minRows = 12 }: Props) {
  const taRef = useRef<HTMLTextAreaElement | null>(null)
  const [tab, setTab] = useState<'write' | 'preview'>('write')

  const rows = useMemo(() => clamp(minRows, 6, 40), [minRows])

  const focusAndSetSelection = useCallback((start: number, end: number) => {
    const el = taRef.current
    if (!el) return
    el.focus()
    try {
      el.setSelectionRange(start, end)
    } catch {}
  }, [])

  const replaceRange = useCallback(
    (start: number, end: number, insert: string, cursorOffset?: { startDelta: number; endDelta: number }) => {
      const before = value.slice(0, start)
      const selected = value.slice(start, end)
      const after = value.slice(end)
      const next = before + insert + after
      onChange(next)

      // selection 복구(버튼 누른 뒤 커서 위치 자연스럽게)
      const base = before.length
      const newStart = base + (cursorOffset?.startDelta ?? 0)
      const newEnd = base + (cursorOffset?.endDelta ?? insert.length)
      requestAnimationFrame(() => focusAndSetSelection(newStart, newEnd))
      return selected
    },
    [value, onChange, focusAndSetSelection]
  )

  const withSelection = useCallback(
    (fn: (start: number, end: number) => void) => {
      const el = taRef.current
      if (!el) return
      const start = el.selectionStart ?? 0
      const end = el.selectionEnd ?? 0
      fn(start, end)
    },
    []
  )

  // ✅ Bold: **선택**
  const applyBold = useCallback(() => {
    withSelection((start, end) => {
      const selected = value.slice(start, end)
      // 선택이 없으면 placeholder 텍스트를 넣어주자
      const inner = selected || 'bold text'
      const insert = `**${inner}**`
      if (selected) {
        replaceRange(start, end, insert, { startDelta: 2, endDelta: 2 + inner.length })
      } else {
        replaceRange(start, end, insert, { startDelta: 2, endDelta: 2 + inner.length })
      }
    })
  }, [withSelection, value, replaceRange])

  // ✅ Heading: 현재 줄 앞에 ## / ### 토글
  const applyHeading = useCallback(
    (level: 2 | 3) => {
      const prefix = level === 2 ? '## ' : '### '
      withSelection((start, end) => {
        const lineStart = getLineStart(value, start)
        const lineEnd = getLineEnd(value, start)
        const line = value.slice(lineStart, lineEnd)

        let nextLine = line
        if (line.startsWith(prefix)) {
          nextLine = line.slice(prefix.length)
        } else if (line.startsWith('## ') || line.startsWith('### ')) {
          // 다른 heading이면 교체
          nextLine = prefix + line.replace(/^#{2,3}\s+/, '')
        } else {
          nextLine = prefix + line
        }

        const insert = nextLine
        replaceRange(lineStart, lineEnd, insert, {
          startDelta: 0,
          endDelta: insert.length,
        })
      })
    },
    [withSelection, value, replaceRange]
  )

  // ✅ Bullets: 선택한 줄마다 "- " 붙이기/해제
  const applyBullets = useCallback(() => {
    withSelection((start, end) => {
      const a = getLineStart(value, start)
      const b = getLineEnd(value, end)
      const block = value.slice(a, b)
      const lines = block.split('\n')

      const allHave = lines.every((ln) => ln.trim() === '' || ln.startsWith('- '))
      const next = lines
        .map((ln) => {
          if (ln.trim() === '') return ln
          if (allHave) return ln.startsWith('- ') ? ln.slice(2) : ln
          return ln.startsWith('- ') ? ln : `- ${ln}`
        })
        .join('\n')

      replaceRange(a, b, next, { startDelta: 0, endDelta: next.length })
    })
  }, [withSelection, value, replaceRange])

  // ✅ Numbered: 선택한 줄마다 "1. " 붙이기(간단 버전: 토글은 제거만)
  const applyNumbered = useCallback(() => {
    withSelection((start, end) => {
      const a = getLineStart(value, start)
      const b = getLineEnd(value, end)
      const block = value.slice(a, b)
      const lines = block.split('\n')

      const allHave = lines.every((ln) => ln.trim() === '' || /^\d+\.\s/.test(ln))
      const next = lines
        .map((ln, i) => {
          if (ln.trim() === '') return ln
          if (allHave) return ln.replace(/^\d+\.\s/, '')
          if (/^\d+\.\s/.test(ln)) return ln
          return `${i + 1}. ${ln}`
        })
        .join('\n')

      replaceRange(a, b, next, { startDelta: 0, endDelta: next.length })
    })
  }, [withSelection, value, replaceRange])

  // ✅ Quote: 선택한 줄마다 "> " 토글
  const applyQuote = useCallback(() => {
    withSelection((start, end) => {
      const a = getLineStart(value, start)
      const b = getLineEnd(value, end)
      const block = value.slice(a, b)
      const lines = block.split('\n')

      const allHave = lines.every((ln) => ln.trim() === '' || ln.startsWith('> '))
      const next = lines
        .map((ln) => {
          if (ln.trim() === '') return ln
          if (allHave) return ln.startsWith('> ') ? ln.slice(2) : ln
          return ln.startsWith('> ') ? ln : `> ${ln}`
        })
        .join('\n')

      replaceRange(a, b, next, { startDelta: 0, endDelta: next.length })
    })
  }, [withSelection, value, replaceRange])

  // ✅ Link: [text](url)
  const applyLink = useCallback(() => {
    withSelection((start, end) => {
      const selected = value.slice(start, end) || 'link text'
      const insert = `[${selected}](https://)`
      // 커서는 url에 두는 게 편함
      const urlStart = insert.indexOf('https://')
      replaceRange(start, end, insert, { startDelta: urlStart, endDelta: insert.length - 1 })
    })
  }, [withSelection, value, replaceRange])

  return (
    <div className="rounded-xl border border-[#e9e9e9] bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#eeeeee] px-3 py-2 bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={applyBold}
            className="h-8 px-2 rounded-md border border-[#e9e9e9] text-[12px] font-semibold hover:bg-[#f5f5f5]"
            title="Bold"
          >
            B
          </button>

          <button
            type="button"
            onClick={() => applyHeading(2)}
            className="h-8 px-2 rounded-md border border-[#e9e9e9] text-[12px] font-semibold hover:bg-[#f5f5f5]"
            title="Heading 2"
          >
            H2
          </button>

          <button
            type="button"
            onClick={() => applyHeading(3)}
            className="h-8 px-2 rounded-md border border-[#e9e9e9] text-[12px] font-semibold hover:bg-[#f5f5f5]"
            title="Heading 3"
          >
            H3
          </button>

          <button
            type="button"
            onClick={applyBullets}
            className="h-8 px-2 rounded-md border border-[#e9e9e9] text-[12px] font-semibold hover:bg-[#f5f5f5]"
            title="Bulleted list"
          >
            • List
          </button>

          <button
            type="button"
            onClick={applyNumbered}
            className="h-8 px-2 rounded-md border border-[#e9e9e9] text-[12px] font-semibold hover:bg-[#f5f5f5]"
            title="Numbered list"
          >
            1. List
          </button>

          <button
            type="button"
            onClick={applyQuote}
            className="h-8 px-2 rounded-md border border-[#e9e9e9] text-[12px] font-semibold hover:bg-[#f5f5f5]"
            title="Quote"
          >
            “ Quote
          </button>

          <button
            type="button"
            onClick={applyLink}
            className="h-8 px-2 rounded-md border border-[#e9e9e9] text-[12px] font-semibold hover:bg-[#f5f5f5]"
            title="Link"
          >
            🔗 Link
          </button>
        </div>

        {/* Write / Preview */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('write')}
            className={[
              'h-8 px-3 rounded-md text-[12px] font-semibold border',
              tab === 'write' ? 'bg-[#1e1e1e] text-white border-[#1e1e1e]' : 'bg-white text-[#1e1e1e] border-[#e9e9e9]',
            ].join(' ')}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={[
              'h-8 px-3 rounded-md text-[12px] font-semibold border',
              tab === 'preview' ? 'bg-[#1e1e1e] text-white border-[#1e1e1e]' : 'bg-white text-[#1e1e1e] border-[#e9e9e9]',
            ].join(' ')}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Editor */}
      {tab === 'write' ? (
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-4 py-3 text-[14px] leading-relaxed outline-none"
        />
      ) : (
        <div className="px-4 py-3 prose max-w-none prose-p:my-2 prose-li:my-1 prose-headings:mt-4 prose-headings:mb-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{value || ''}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
