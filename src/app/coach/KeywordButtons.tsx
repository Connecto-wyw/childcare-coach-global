// src/app/coach/KeywordButtons.tsx  (Client Component)
'use client';

import { useMemo, useCallback } from 'react';

export const COACH_SET_MESSAGE_EVENT = 'coach:setMessage';

type Props = {
  keywords?: string[];
  className?: string;
  max?: number;
};

export default function KeywordButtons({ keywords, className, max = 12 }: Props) {
  const items = useMemo(() => {
    const defaults = ['수면', '식습관', '학습', '정서', '생활습관'];
    const arr = (keywords?.length ? keywords : defaults).filter(Boolean);
    const deduped = Array.from(new Set(arr));
    return deduped.slice(0, Math.max(1, max));
  }, [keywords, max]);

  const fill = useCallback((kw: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<string>(COACH_SET_MESSAGE_EVENT, { detail: kw }));
  }, []);

  return (
    <div className={className ?? 'flex justify-center gap-3 flex-wrap'}>
      {items.map((kw) => (
        <button
          key={kw}
          type="button"
          onClick={() => fill(kw)}
          className="bg-[#3a3a3a] text-white text-sm font-bold px-4 py-1 rounded hover:opacity-90 transition"
          aria-label={`키워드 ${kw} 선택`}
        >
          {kw}
        </button>
      ))}
    </div>
  );
}
