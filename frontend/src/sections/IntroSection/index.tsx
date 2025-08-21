'use client';

export default function Intro() {
  return (
    <>
      <section id="intro-1" className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-2xl">
          <p
            className="font-chinese text-base text-white leading-relaxed tracking-wide mb-4 text-center"
            style={{ fontSize: 'clamp(1rem,4vw,1rem)', lineHeight: '1.4' }}
          >
            我們在城市裡行走，<br />
            彷彿它不曾說話。<br />
            但每一次高溫，每一場雨，<br />
            都是它在回應我們的沉默。
          </p>
          <p
            className="font-mono text-sm text-[#8af0f4] leading-snug tracking-wide text-center"
            style={{ fontSize: 'clamp(0.75rem,2.5vw,0.75rem)', lineHeight: '1.4' }}
          >
            We walk through the city as if it were silent.<br />
            But every heatwave, every sudden rain —<br />
            is the city answering our silence.
          </p>
        </div>
      </section>

      <section id="intro-2" className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center max-w-2xl">
          <p
            className="font-chinese text-base text-white leading-relaxed tracking-wide mb-4 text-center"
            style={{ fontSize: 'clamp(1rem,4vw,1rem)', lineHeight: '1.4' }}
          >
            你願意，聽聽它過去的記憶，<br />
            和我們能共同寫下的未來嗎？
          </p>
          <p
            className="font-mono text-sm text-[#8af0f4] leading-snug tracking-wide text-center"
            style={{ fontSize: 'clamp(0.75rem,2.5vw,0.75rem)', lineHeight: '1.4' }}
          >
            Would you listen to what it remembers,<br />
            and what we might shape together?
          </p>
        </div>
      </section>

      <div className="h-screen" />
    </>
  );
}
