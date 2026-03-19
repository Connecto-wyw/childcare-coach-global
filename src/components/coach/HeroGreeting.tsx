'use client'

type Props = {
  hello: string
  subtitle: string
}

export default function HeroGreeting({ hello, subtitle }: Props) {
  return (
    <section className="text-center mb-16">
      <style>{`
        @keyframes bounceIn {
          0%   { opacity: 0; transform: scale(0.4) translateY(-30px); }
          50%  { opacity: 1; transform: scale(1.12) translateY(0); }
          70%  { transform: scale(0.94); }
          85%  { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @keyframes bounceInSub {
          0%   { opacity: 0; transform: scale(0.5) translateY(20px); }
          55%  { opacity: 1; transform: scale(1.1) translateY(0); }
          75%  { transform: scale(0.95); }
          90%  { transform: scale(1.04); }
          100% { transform: scale(1); }
        }
        .hero-hello {
          animation: bounceIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .hero-subtitle {
          animation: bounceInSub 0.75s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-hello, .hero-subtitle { animation: none; }
        }
      `}</style>
      <div className="leading-tight">
        <div className="hero-hello text-[30px] text-[#0e0e0e] font-Light">{hello}</div>
        <div className="hero-subtitle text-[22px] text-[#0e0e0e] font-semibold">{subtitle}</div>
      </div>
    </section>
  )
}
