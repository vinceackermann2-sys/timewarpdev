import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const AiCeo = () => {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      {/* Phone mockup */}
      <div className="relative w-[300px] sm:w-[340px]">
        {/* Phone outer frame */}
        <div
          className="rounded-[2.5rem] overflow-hidden"
          style={{
            background: "#1a1f2e",
            padding: "3px",
            boxShadow: "0 25px 80px -15px rgba(0,0,0,0.35)",
          }}
        >
          {/* Phone inner bezel with blue border */}
          <div
            className="rounded-[2.3rem] overflow-hidden"
            style={{
              border: "1.5px solid rgba(59, 130, 246, 0.5)",
              background: "#0f1219",
            }}
          >
            {/* Status bar */}
            <div className="flex items-center justify-between px-7 pt-3 pb-1 text-white/50 text-[11px] relative">
              <span className="font-medium">9:41</span>
              {/* Notch */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[100px] h-[28px] bg-[#1a1f2e] rounded-b-2xl" />
              {/* Status icons */}
              <div className="flex items-center gap-1.5">
                {/* Signal bars */}
                <svg width="14" height="10" viewBox="0 0 15 11" fill="currentColor">
                  <rect x="0" y="8" width="2.5" height="3" rx="0.5" />
                  <rect x="4" y="5.5" width="2.5" height="5.5" rx="0.5" />
                  <rect x="8" y="3" width="2.5" height="8" rx="0.5" />
                  <rect x="12" y="0" width="2.5" height="11" rx="0.5" />
                </svg>
                {/* WiFi */}
                <svg width="13" height="10" viewBox="0 0 24 18" fill="currentColor">
                  <path d="M1 5.5C4.8 1.8 8.2 0 12 0s7.2 1.8 11 5.5l-2.2 2.2C17.8 4.8 15 3.2 12 3.2S6.2 4.8 3.2 7.7L1 5.5z" />
                  <path d="M5.5 10C7.3 8.2 9.5 7 12 7s4.7 1.2 6.5 3l-2.2 2.2C15 11 13.5 10.2 12 10.2s-3 .8-4.3 2L5.5 10z" />
                  <circle cx="12" cy="15.5" r="2" />
                </svg>
                {/* Battery */}
                <svg width="20" height="10" viewBox="0 0 28 13" fill="currentColor">
                  <rect x="0" y="0" width="24" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="2.5" y="2.5" width="19" height="8" rx="1.5" />
                  <rect x="25" y="4" width="3" height="5" rx="1" />
                </svg>
              </div>
            </div>

            {/* App screen content */}
            <div className="px-4 pb-5 pt-2">
              {/* Green status indicator */}
              <div className="flex items-center gap-2 mb-4">
                <span className="h-3 w-1.5 rounded-sm bg-green-500" />
              </div>

              {/* Chat area */}
              <div
                className="rounded-xl overflow-hidden mb-5"
                style={{
                  border: "1px solid rgba(100, 130, 180, 0.2)",
                  background: "#151b28",
                }}
              >
                <div className="p-3.5">
                  {/* User message - right aligned */}
                  <div className="flex justify-end mb-3">
                    <div
                      className="rounded-full px-4 py-2 text-white/60 text-[11px] flex items-center gap-2 max-w-[85%]"
                      style={{
                        border: "1px solid rgba(150, 160, 200, 0.15)",
                        background: "#1c2535",
                      }}
                    >
                      <span className="truncate">how much do we spend per day?</span>
                      <span className="h-4 w-4 rounded-full bg-purple-400/40 flex items-center justify-center flex-shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                      </span>
                    </div>
                  </div>

                  {/* AI response - left aligned */}
                  <div className="flex items-start gap-2">
                    <div className="h-5 w-5 rounded-full bg-purple-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                    </div>
                    <div
                      className="rounded-full px-4 py-2 text-white/50 text-[11px] max-w-[80%]"
                      style={{
                        border: "1px solid rgba(150, 160, 200, 0.15)",
                        background: "#1c2535",
                      }}
                    >
                      your biggest spend is employees...
                    </div>
                  </div>
                </div>

                {/* Large empty dark area */}
                <div className="h-44" style={{ background: "#111720" }} />
              </div>

              {/* CTA Button */}
              <Button
                asChild
                className="w-full rounded-lg h-11 text-sm font-semibold bg-[#3b82f6] hover:bg-[#2563eb] text-white border-0"
              >
                <Link to="/auth?mode=signup">Run AI CEO</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiCeo;
