'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'

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
      const after = value.slice(end)
      const next = before + insert + after
      onChange(next)

      const base = before.length
      const newStart = base + (cursorOffset?.startDelta ?? 0)
      const newEnd = base + (cursorOffset?.endDelta ?? insert.length)
      requestAnimationFrame(() => focusAndSetSelection(newStart, newEnd))
    },
    [value, onChange, focusAndSetSelection]
  )

  const withSelection = useCallback((fn: (start: number, end: number) => void) => {
    const el = taRef.current
    if (!el) return
    const start = el.selectionStart ?? 0
    const end = el.selectionEnd ?? 0
    fn(start, end)
  }, [])

  const applyBold = useCallback(() => {
    withSelection((start, end) => {
      const selected = value.slice(start, end)
      const inner = selected || 'bold text'
      const insert = `**${inner}**`
      replaceRange(start, end, insert, { startDelta: 2, endDelta: 2 + inner.length })
    })
  }, [withSelection, value, replaceRange])

  const applyHeading = useCallback(
    (level: 2 | 3) => {
      const prefix = level === 2 ? '## ' : '### '
      withSelection((start) => {
        const lineStart = getLineStart(value, start)
        const lineEnd = getLineEnd(value, start)
        const line = value.slice(lineStart, lineEnd)

        let nextLine = line
        if (line.startsWith(prefix)) {
          nextLine = line.slice(prefix.length)
        } else if (line.startsWith('## ') || line.startsWith('### ')) {
          nextLine = prefix + line.replace(/^#{2,3}\s+/, '')
        } else {
          nextLine = prefix + line
        }

        replaceRange(lineStart, lineEnd, nextLine, { startDelta: 0, endDelta: nextLine.length })
      })
    },
    [withSelection, value, replaceRange]
  )

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

  const applyLink = useCallback(() => {
    withSelection((start, end) => {
      const selected = value.slice(start, end) || 'link text'
      const insert = `[${selected}](https://)`
      const urlStart = insert.indexOf('https://')
      replaceRange(start, end, insert, { startDelta: urlStart, endDelta: insert.length - 1 })
    })
  }, [withSelection, value, replaceRange])

  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1f1f1f] overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#2a2a2a] px-3 py-2 bg-[#1f1f1f]">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={applyBold} className="h-8 px-2 rounded-md border border-[#2a2a2a] text-[12px] font-semibold text-white hover:bg-[#2a2a2a]">
            B
          </button>
          <button type="button" onClick={() => applyHeading(2)} className="h-8 px-2 rounded-md border border-[#2a2a2a] text-[12px] font-semibold text-white hover:bg-[#2a2a2a]">
            H2
          </button>
          <button type="button" onClick={() => applyHeading(3)} className="h-8 px-2 rounded-md border border-[#2a2a2a] text-[12px] font-semibold text-white hover:bg-[#2a2a2a]">
            H3
          </button>
          <button type="button" onClick={applyBullets} className="h-8 px-2 rounded-md border border-[#2a2a2a] text-[12px] font-semibold text-white hover:bg-[#2a2a2a]">
            • List
          </button>
          <button type="button" onClick={applyNumbered} className="h-8 px-2 rounded-md border border-[#2a2a2a] text-[12px] font-semibold text-white hover:bg-[#2a2a2a]">
            1. List
          </button>
          <button type="button" onClick={applyQuote} className="h-8 px-2 rounded-md border border-[#2a2a2a] text-[12px] font-semibold text-white hover:bg-[#2a2a2a]">
            “ Quote
          </button>
          <button type="button" onClick={applyLink} className="h-8 px-2 rounded-md border border-[#2a2a2a] text-[12px] font-semibold text-white hover:bg-[#2a2a2a]">
            🔗 Link
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('write')}
            className={[
              'h-8 px-3 rounded-md text-[12px] font-semibold border',
              tab === 'write' ? 'bg-white text-[#111] border-white' : 'bg-[#1f1f1f] text-white border-[#2a2a2a]',
            ].join(' ')}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={[
              'h-8 px-3 rounded-md text-[12px] font-semibold border',
              tab === 'preview' ? 'bg-white text-[#111] border-white' : 'bg-[#1f1f1f] text-white border-[#2a2a2a]',
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
          className="w-full px-4 py-3 text-[14px] leading-relaxed outline-none bg-[#2a2a2a] text-white placeholder:text-white/40"
        />
      ) : (
        <div className="px-4 py-3 text-white">
          <div className="prose max-w-none prose-invert prose-p:my-2 prose-li:my-1 prose-headings:mt-4 prose-headings:mb-2">
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{value || ''}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
