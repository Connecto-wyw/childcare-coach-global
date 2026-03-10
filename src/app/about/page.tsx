// src/app/about/page.tsx (Server Component)
import { getDictionary, getLocale } from '@/i18n'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TEXT = '#0e0e0e'
const MUTED = '#b4b4b4'
const BORDER = '#eeeeee'
const INDIANBOB_RED = '#9F1D23'

export default async function AboutPage() {
  const year = new Date().getFullYear()
  const locale = await getLocale()
  
  // Load the dictionary for the about page on the server
  const dict = await getDictionary('about')

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Header (News 페이지 톤과 통일) */}
        <h1 className="text-[24px] font-medium leading-tight">{dict.title}</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          {dict.subtitle}
        </p>

        <div className="mt-10 border-t" style={{ borderColor: BORDER }}>
          {/* Quote block */}
          <section className="py-16 text-center">
            <p className="text-[13px] leading-relaxed mx-auto max-w-[720px]" style={{ color: MUTED }}>
              {dict.originText}
            </p>

            <div className="mt-10 mx-auto max-w-[900px]">
              <div className="text-[22px] sm:text-[28px] leading-snug font-semibold">
                <span>{dict.heroText1} </span>
                <CircledWord text={dict.heroHighlight1} />
                <span>{dict.heroText2} </span>
                <CircledWord text={dict.heroHighlight2} />
                <span>{dict.heroText3} </span>
                <CircledWord text={dict.heroHighlight3} />
                <span>{dict.heroText4}</span>
              </div>

              <p className="mt-8 text-[14px] leading-relaxed mx-auto max-w-[820px]">
                {dict.heroDesc1}
                <br />
                {dict.heroDesc2}
              </p>

              <div className="mt-10 flex items-center justify-center gap-6 flex-wrap">
                <StepPill label={dict.pill1} />
                <StepPill label={dict.pill2} />
                <StepPill label={dict.pill3} />
              </div>
            </div>
          </section>

          {/* Image (2134x1513 비율, 안 잘림) */}
          <section className="border-t" style={{ borderColor: BORDER }}>
            <div className="py-10">
              <div className="w-full bg-[#f2f2f2] overflow-hidden">
                {/* ✅ 원본 비율(2134/1513)로 컨테이너 잡기 */}
                <div className="w-full aspect-[2134/1513] relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/about/about-hero.jpg"
                    alt="IndianBob"
                    className="absolute inset-0 w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>

                <div className="px-5 py-10">
                  <div className="text-[12px] font-semibold tracking-wide" style={{ color: INDIANBOB_RED }}>
                    {dict.brandLabel}
                  </div>
                  <div className="mt-2 text-[18px] sm:text-[20px] font-semibold leading-snug">
                    {dict.brandSlogan}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Body text (줄바꿈/빈줄 제거 + 2px 다운 + 볼드 제거) */}
          <section className="border-t" style={{ borderColor: BORDER }}>
            <div className="py-12">
              <div className="mx-auto max-w-[860px]">
                <p className="text-[14px] sm:text-[16px] leading-relaxed">
                  {dict.bodyText}
                </p>

                <div className="mt-10">
                  <div className="text-[18px] sm:text-[20px] tracking-wide" style={{ fontWeight: 600 }}>
                    {dict.brandSlogan}
                  </div>
                  <div className="mt-2 text-[14px]" style={{ color: INDIANBOB_RED, fontWeight: 600 }}>
                    {dict.brandLabel}
                  </div>
                </div>

                <div className="mt-12 border-t" style={{ borderColor: BORDER }} />
                <div className="mt-6 text-[12px]" style={{ color: MUTED }}>
                  {dict.copyright.replace('{year}', year.toString())}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

function StepPill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center h-9 px-4 rounded-full text-[12px]"
      style={{
        color: '#1e1e1e',
        background: '#F7F7F7',
        border: '1px solid #EAEAEA',
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  )
}

function CircledWord({ text }: { text: string }) {
  return (
    <span className="relative inline-block mx-1">
      <span className="relative z-10">{text}</span>
      <span aria-hidden className="absolute -inset-x-3 -inset-y-2 rounded-full border" style={{ borderColor: '#0e0e0e' }} />
    </span>
  )
}