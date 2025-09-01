// src/app/coach/KeywordButtons.tsx  (Client Component)
'use client';

import { useMemo, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export const COACH_SET_MESSAGE_EVENT = 'coach:setMessage';

type Props = {
  /** 외부에서 직접 키워드 배열을 넘기면 이 값을 우선 사용 */
  keywords?: string[];
  className?: string;
  max?: number;
};

type PopularKeywordRow = {
  keyword: string;
  order: number;
};

export default function KeywordButtons({ keywords, className, max = 12 }: Props) {
  const [dbKeywords, setDbKeywords] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (keywords && keywords.length > 0) return; // 프롭이 있으면 DB 조회 생략

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('popular_keywords')
          .select('keyword,"order"')
          .order('order', { ascending: true });

        if (!error && data) {
          const arr = (data as PopularKeywordRow[])
            .map((r) => r.keyword)
            .filter(Boolean);
          if (!cancelled) setDbKeywords(arr);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [keywords]);

  const items = useMemo(() => {
    const fallback = ['Sleep', 'Eating habits', 'Learning', 'Emotions', 'Daily routine'];
    const source = (keywords && keywords.length > 0) ? keywords : (dbKeywords.length > 0 ? dbKeywords : fallback);
    const deduped = Array.from(new Set(source.filter(Boolean)));
    return deduped.slice(0, Math.max(1, max));
  }, [keywords, dbKeywords, max]);

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
          aria-label={`Select keyword ${kw}`}
          disabled={loading && dbKeywords.length === 0 && (!keywords || keywords.length === 0)}
        >
          {kw}
        </button>
      ))}
    </div>
  );
}
