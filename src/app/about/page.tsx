// src/app/about/page.tsx (Server Component)
export const dynamic = 'force-dynamic'
export const revalidate = 0

const TEXT = '#0e0e0e'
const MUTED = '#b4b4b4'
const BORDER = '#eeeeee'
const INDIANBOB_RED = '#9F1D23'

export default async function AboutPage() {
  const year = new Date().getFullYear()

  return (
    <main className="min-h-screen bg-white" style={{ color: TEXT }}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        {/* Header (News 페이지 톤과 통일) */}
        <h1 className="text-[24px] font-medium leading-tight">About</h1>
        <p className="mt-3 text-[14px]" style={{ color: MUTED }}>
          TEAM UP FOR FAMILY GROWTH
        </p>

        <div className="mt-10 border-t" style={{ borderColor: BORDER }}>
          {/* Quote block */}
          <section className="py-16 text-center">
            <p className="text-[13px] leading-relaxed mx-auto max-w-[720px]" style={{ color: MUTED }}>
              IndianBob is a family-tech app originated in Korea.
            </p>

            <div className="mt-10 mx-auto max-w-[900px]">
              <div className="text-[22px] sm:text-[28px] leading-snug font-semibold">
                <span>After analyzing parenting </span>
                <CircledWord text="challenges" />
                <span>, we provide practical </span>
                <CircledWord text="guidance" />
                <span>, tailored to each family&apos;s unique </span>
                <CircledWord text="context" />
                <span>.</span>
              </div>

              <p className="mt-8 text-[14px] leading-relaxed mx-auto max-w-[820px]">
                We believe parenting and child development should be a team effort, not a solo journey.
                <br />
                By understanding each child’s personality and growth data, connecting families, and leveraging AI, we support everyday parenting decisions.
              </p>

              <div className="mt-10 flex items-center justify-center gap-6 flex-wrap">
                <StepPill label="Analyzing Challenges" />
                <StepPill label="Building Context" />
                <StepPill label="Creating Guidance" />
              </div>
            </div>
          </section>

          {/* Image (1:1, 안 잘림) */}
          <section className="border-t" style={{ borderColor: BORDER }}>
            <div className="py-10">
              <div className="w-full bg-[#f2f2f2] overflow-hidden">
                <div className="w-full aspect-square relative">
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
                    INDIANBOB
                  </div>
                  <div className="mt-2 text-[18px] sm:text-[20px] font-semibold leading-snug">
                    TEAM UP FOR FAMILY GROWTH
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
                  IndianBob is a family-tech app originated in Korea. We believe parenting and child development should be a team effort, not a solo journey. By understanding each child’s personality and growth data, connecting families, and leveraging AI, we support everyday parenting decisions. After analyzing parenting challenges, we provide practical guidance tailored to each family’s unique context.
                </p>

                <div className="mt-10">
                  <div className="text-[18px] sm:text-[20px] tracking-wide" style={{ fontWeight: 600 }}>
                    TEAM UP FOR FAMILY GROWTH
                  </div>
                  <div className="mt-2 text-[14px]" style={{ color: INDIANBOB_RED, fontWeight: 600 }}>
                    INDIANBOB
                  </div>
                </div>

                <div className="mt-12 border-t" style={{ borderColor: BORDER }} />
                <div className="mt-6 text-[12px]" style={{ color: MUTED }}>
                  © {year} IndianBob. All rights reserved.
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
      <span
        aria-hidden
        className="absolute -inset-x-3 -inset-y-2 rounded-full border"
        style={{ borderColor: '#0e0e0e' }}
      />
    </span>
  )
}