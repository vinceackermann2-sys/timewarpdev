import React from "react";
import { PhoneMockup } from "./PhoneMockup";
interface HeroSectionProps {
  onRunClick?: () => void;
}

export function HeroSection({ onRunClick }: HeroSectionProps) {
  return <section className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-start">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 z-0">
        {/* Deep dark top */}
        <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #05070f 0%, #0a0f1e 30%, #0d1528 60%, #111d3a 100%)"
      }} />

        {/* Colorful bottom glow (Aurora) */}
        <div className="absolute inset-0" style={{
        background: `
              radial-gradient(ellipse 120% 60% at 50% 105%, rgba(99, 102, 241, 0.35) 0%, transparent 60%),
              radial-gradient(ellipse 100% 50% at 50% 110%, rgba(139, 92, 246, 0.25) 0%, transparent 55%),
              radial-gradient(ellipse 80% 40% at 50% 100%, rgba(59, 130, 246, 0.2) 0%, transparent 50%)
            `
      }} />

        {/* Radial glows for depth */}
        <div className="absolute" style={{
        width: "60%",
        height: "40%",
        bottom: 0,
        left: "20%",
        background: "radial-gradient(ellipse at center, rgba(168, 130, 255, 0.08) 0%, transparent 70%)",
        filter: "blur(40px)"
      }} />
        <div className="absolute" style={{
        width: "30%",
        height: "30%",
        bottom: "5%",
        left: "35%",
        background: "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.12) 0%, transparent 70%)",
        filter: "blur(60px)"
      }} />

        {/* Noise / texture overlay */}
        <div className="absolute inset-0" style={{
        backgroundImage: `
              radial-gradient(circle at 20% 30%, rgba(255,255,255,0.01) 1px, transparent 1px),
              radial-gradient(circle at 80% 20%, rgba(255,255,255,0.015) 1px, transparent 1px),
              radial-gradient(circle at 50% 60%, rgba(255,255,255,0.008) 1px, transparent 1px)
            `,
        backgroundSize: "120px 100px, 180px 140px, 90px 80px"
      }} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-10 sm:pt-16 pb-10 flex flex-col items-center text-center">
        {/* Headline */}
        <h1 className="leading-[1.05] tracking-tight mb-5 my-0 mx-0" style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: "clamp(36px, 5.5vw, 68px)",
        fontWeight: 800,
        color: "#ffffff",
        letterSpacing: "-0.02em"
      }}>
          Get business decisions
          <br />
          completed in seconds
        </h1>

        {/* Subtitle */}
        <p className="max-w-lg mb-8 sm:mb-12 leading-relaxed px-4" style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: "clamp(15px, 3.5vw, 17px)",
        color: "rgba(255,255,255,0.45)",
        fontWeight: 400,
        lineHeight: 1.7
      }}>
          AI CEO runs deep research on your business and turns your data into
          <br />
          levers pulled–for you
        </p>

        {/* Phone Mockup Container */}
        <div className="relative mb-10">
          {/* Glow behind phone */}
          <div className="absolute" style={{
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 300,
          height: 200,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(99, 102, 241, 0.15) 0%, rgba(59, 130, 246, 0.08) 40%, transparent 70%)",
          filter: "blur(40px)"
        }} />
          <PhoneMockup onRunClick={onRunClick} />
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center" style={{
        gap: 32,
        fontSize: 13,
        color: "rgba(255,255,255,0.4)",
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}>
          <div className="flex items-center gap-2">
            <span style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 6px rgba(74, 222, 128, 0.4)"
          }} />
            <span>No credit card</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#60a5fa",
            boxShadow: "0 0 6px rgba(96, 165, 250, 0.4)"
          }} />
            <span>15-90 Seconds</span>
          </div>
        </div>
      </div>
    </section>;
}