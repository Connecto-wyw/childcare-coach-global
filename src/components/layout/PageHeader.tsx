// src/components/layout/PageHeader.tsx
import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: ReactNode
  subtitle?: ReactNode
  align?: 'left' | 'center'
  showDivider?: boolean
  dividerMarginTopClassName?: string
  titleClassName?: string
  subtitleClassName?: string
}

const BORDER = '#eeeeee'
const MUTED = '#b4b4b4'

export default function PageHeader({
  title,
  subtitle,
  align = 'left',
  showDivider = true,
  dividerMarginTopClassName = 'mt-10',
  titleClassName = 'text-[24px] font-medium leading-tight',
  subtitleClassName = 'mt-3 text-[14px]',
}: PageHeaderProps) {
  const isCenter = align === 'center'

  return (
    <div className={isCenter ? 'text-center' : 'text-left'}>
      <h1 className={titleClassName}>{title}</h1>

      {subtitle ? (
        <p className={subtitleClassName} style={{ color: MUTED }}>
          {subtitle}
        </p>
      ) : null}

      {showDivider ? (
        <div className={`${dividerMarginTopClassName} border-t`} style={{ borderColor: BORDER }} />
      ) : null}
    </div>
  )
}