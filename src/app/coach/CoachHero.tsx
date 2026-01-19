// src/app/coach/CoachHero.tsx
'use client'

import Logo from '@/components/Logo'
import KeywordButtons from './KeywordButtons'
import { motion, type Variants } from 'framer-motion'

type Props = {
  keywords: string[]
}

const wrap: Variants = {
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: 'easeOut', // ✅ 타입 에러 해결
    },
  },
}

export default function CoachHero({ keywords }: Props) {
  return (
    <motion.div variants={wrap} initial="hidden" animate="show">
      <motion.div variants={item} className="flex justify-center mb-4">
        <Logo />
      </motion.div>

      <motion.section variants={item} className="text-center mb-6">
        <div className="leading-tight">
          <div className="text-[23px] text-[#0e0e0e] font-medium">Ask me anything</div>
          <div className="text-[23px] text-[#0e0e0e] font-light">about parenting</div>
        </div>
      </motion.section>

      <motion.section variants={item} className="mb-6">
        <div className="text-[13px] font-medium text-[#0e0e0e] mb-3">Popular ways to get started</div>
        <KeywordButtons keywords={keywords} />
      </motion.section>
    </motion.div>
  )
}
