import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import researcherIllustration from "@/assets/researcher-illustration.png";

const AiCeo = () => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {/* Phone mockup */}
      <div className="w-[280px] sm:w-[320px]">
        {/* Phone outer frame */}
        <div
          className="rounded-[2rem] overflow-hidden"
          style={{
            background: "#181d2a",
            padding: "10px",
            boxShadow: "0 30px 80px -15px rgba(0,0,0,0.3)",
          }}
        >
          {/* Status bar */}
          <div className="relative flex items-center justify-between px-6 pt-2.5 pb-1 text-white/50 text-[11px]">
            <span className="font-medium">9:41</span>
            <div
              className="absolute left-1/2 -translate-x-1/2 top-0 w-[80px] h-[24px] rounded-b-2xl"
              style={{ background: "#101420" }}
            />
            <div className="flex items-center gap-1.5">
              <svg width="14" height="10" viewBox="0 0 15 11" fill="currentColor">
                <rect x="0" y="8" width="2.5" height="3" rx="0.5" />
                <rect x="4" y="5.5" width="2.5" height="5.5" rx="0.5" />
                <rect x="8" y="3" width="2.5" height="8" rx="0.5" />
                <rect x="12" y="0" width="2.5" height="11" rx="0.5" />
              </svg>
              <svg width="13" height="10" viewBox="0 0 24 18" fill="currentColor">
                <path d="M1 5.5C4.8 1.8 8.2 0 12 0s7.2 1.8 11 5.5l-2.2 2.2C17.8 4.8 15 3.2 12 3.2S6.2 4.8 3.2 7.7L1 5.5z" />
                <path d="M5.5 10C7.3 8.2 9.5 7 12 7s4.7 1.2 6.5 3l-2.2 2.2C15 11 13.5 10.2 12 10.2s-3 .8-4.3 2L5.5 10z" />
                <circle cx="12" cy="15.5" r="2" />
              </svg>
              <svg width="20" height="10" viewBox="0 0 28 13" fill="currentColor">
                <rect x="0" y="0" width="24" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <rect x="2.5" y="2.5" width="19" height="8" rx="1.5" />
                <rect x="25" y="4" width="3" height="5" rx="1" />
              </svg>
            </div>
          </div>

          {/* Screen content */}
          <div className="px-3 pt-2 pb-3">
            {/* Ready to research badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className="h-3 w-1.5 rounded-sm bg-green-500" />
              <span className="text-white/80 text-xs font-medium">Ready to research</span>
            </div>

            {/* Chat container with blue border */}
            <div
              className="rounded-xl overflow-hidden mb-4"
              style={{
                border: "1.5px solid rgba(59, 130, 246, 0.4)",
                background: "#1e2738",
              }}
            >
              {/* Chat bubbles area */}
              <div className="p-3" style={{ background: "#252e42" }}>
                {/* User message */}
                <div className="flex justify-end mb-2.5">
                  <div
                    className="rounded-full px-3.5 py-1.5 text-white/55 text-[10px] flex items-center gap-2"
                    style={{
                      border: "1px solid rgba(150, 160, 200, 0.15)",
                      background: "#1e2738",
                    }}
                  >
                    <span>how much do we spend per day?</span>
                    <span className="h-4 w-4 rounded-full bg-purple-400/30 flex items-center justify-center flex-shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                    </span>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex items-start gap-2">
                  <span className="h-5 w-5 rounded-full bg-purple-400/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-purple-400" />
                  </span>
                  <div
                    className="rounded-xl px-3.5 py-1.5 text-white/45 text-[10px] leading-relaxed"
                    style={{
                      border: "1px solid rgba(150, 160, 200, 0.15)",
                      background: "#1e2738",
                    }}
                  >
                    your biggest spend is employees, all costs results to 13,018$ per day
                  </div>
                </div>
              </div>

              {/* Illustration + label area */}
              <div className="flex flex-col items-center py-5 px-4" style={{ background: "#161c28" }}>
                <img
                  src={researcherIllustration}
                  alt="Research documents illustration"
                  className="h-24 w-auto object-contain mb-3"
                />
                <h3 className="text-white font-semibold text-base mb-0.5">Researcher</h3>
                <p className="text-white/40 text-xs">Reveals what to do next</p>
              </div>
            </div>

            {/* CTA Button */}
            <Button
              asChild
              className="w-full rounded-xl h-11 text-sm font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white border-0"
            >
              <Link to="/auth?mode=signup">Run AI CEO</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiCeo;
