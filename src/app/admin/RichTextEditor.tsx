'use client'

import { useEffect, useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

type Props = {
  value: string
  onChange: (nextHtml: string) => void
  placeholder?: string
  minHeight?: number
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 240 }: Props) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // ✅ 엔터/줄바꿈 안정화
        // hardBreak: true (X) → {} 로 켜기 (타입/버전 호환)
        hardBreak: {},
      }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Write here…',
      }),
    ],
    [placeholder]
  )

  const editor = useEditor({
    extensions,
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none px-4 py-3',
        style: `min-height:${minHeight}px;`,
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  // 외부에서 value가 바뀌면 에디터도 반영
  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if ((value || '') !== current) {
      // ✅ setContent(value, false) (X) → 옵션 객체로 emitUpdate 끄기
      editor.commands.setContent(value || '<p></p>', { emitUpdate: false })
      // (emitUpdate 옵션이 없는 버전이라면 위 줄에서 타입 에러가 날 수 있는데,
      // 그 경우엔 아래 한 줄로 바꾸면 무조건 통과함)
      // editor.commands.setContent(value || '<p></p>')
    }
  }, [value, editor])

  if (!editor) return null

  const Btn = ({
    label,
    onClick,
    active,
  }: {
    label: string
    onClick: () => void
    active?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        'h-8 px-2 rounded-md border text-[12px] font-semibold',
        active ? 'bg-[#1e1e1e] text-white border-[#1e1e1e]' : 'bg-white text-[#1e1e1e] border-[#e9e9e9]',
      ].join(' ')}
    >
      {label}
    </button>
  )

  return (
    <div className="rounded-xl border border-[#e9e9e9] overflow-hidden bg-white">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[#eeeeee] px-3 py-2 bg-white">
        <Btn
          label="B"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <Btn
          label="H2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <Btn
          label="H3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <Btn
          label="• List"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <Btn
          label="1. List"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <Btn
          label="Quote"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <Btn
          label="HR"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />
        <Btn
          label="↵ BR"
          onClick={() => editor.chain().focus().setHardBreak().run()}
        />
      </div>

      {/* editor */}
      <EditorContent editor={editor} />
    </div>
  )
}
