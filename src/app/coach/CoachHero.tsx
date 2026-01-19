// src/app/coach/CoachHero.tsx
'use client'

import { useMemo } from 'react'
import { motion, useReducedMotion, type Variants } from 'framer-motion'
import Logo from '@/components/Logo'
import KeywordButtons from './KeywordButtons'

type Props = {
  keywords: string[]
}

export default function CoachHero({ keywords }: Props) {
  const reduced = useReducedMotion()

  const { container, item } = useMemo(() => {
    // ✅ PC/모바일 공통으로 "모바일에서 보기 좋은" 느린 속도 고정
    const itemDuration = reduced ? 0 : 0.55
    const stagger = reduced ? 0 : 0.14
    const delayChildren = reduced ? 0 : 0.08
    const yFrom = 14

    const containerVariants: Variants = {
      hidden: { opacity: 1 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: stagger,
          delayChildren,
        },
      },
    }

    const itemVariants: Variants = {
      hidden: { opacity: 0, y: yFrom },
      show: {
        opacity: 1,
        y: 0,
        transition: reduced
          ? { duration: 0 }
          : {
              duration: itemDuration,
              ease: 'easeOut', // ✅ 타입 안정 + 자연스러움
            },
      },
    }

    return { container: containerVariants, item: itemVariants }
  }, [reduced])

  return (
    <motion.section variants={container} initial="hidden" animate="show" className="text-center">
      <motion.div variants={item} className="flex justify-center mb-4">
        <Logo />
      </motion.div>

      <motion.div variants={item} className="leading-tight mb-6">
        <div className="text-[23px] text-[#0e0e0e] font-medium">Ask me anything</div>
        <div className="text-[23px] text-[#0e0e0e] font-light">about parenting</div>
      </motion.div>

      <motion.div variants={item} className="mb-3 text-left text-[13px] font-medium text-[#0e0e0e]">
        Popular ways to get started
      </motion.div>

      {/* KeywordButtons 내부가 stagger로 애니메이션하므로, 여기서는 wrapper만 */}
      <motion.div variants={item}>
        <KeywordButtons keywords={keywords} />
      </motion.div>
    </motion.section>
  )
}
