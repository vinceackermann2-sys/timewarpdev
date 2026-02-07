import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import researcherIllustration from "@/assets/researcher-illustration.png";

const AiCeo = () => {
  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-start"
      style={{
        background:
          "linear-gradient(180deg, #0a0e1a 0%, #0d1428 10%, #112050 25%, #1a3a80 40%, #2a5ab0 55%, #3a70c8 65%, #5588d8 75%, #8090d0 82%, #b090c8 88%, #d0a0b8 93%, #c898b8 100%)",
      }}
    >
      {/* Stardust overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/stardust.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.4,
        }}
      />

      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 60%, rgba(60, 100, 220, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 30% 10%, rgba(10, 20, 60, 0.3) 0%, transparent 50%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 pt-12 pb-8 flex flex-col items-center text-center">
        {/* Headline */}
        <h1
          className="font-sans text-white leading-[1.05] tracking-tight mb-4"
          style={{
            fontSize: "clamp(40px, 5.5vw, 72px)",
            fontWeight: 800,
          }}
        >
          Get business decisions
          <br />
          completed in seconds
        </h1>

        {/* Subtitle */}
        <p
          className="max-w-xl mb-10 leading-relaxed"
          style={{
            fontSize: "15px",
            color: "rgba(255,255,255,0.5)",
            fontWeight: 400,
          }}
        >
          AI CEO runs deep research on your business and turns your data into
          <br />
          levers pulled–for you
        </p>

        {/* Phone mockup */}
        <div style={{ width: 260 }} className="mb-8">
          <div
            style={{
              background: "#13171f",
              borderRadius: 28,
              padding: "8px 8px 10px",
              boxShadow: "0 40px 100px -20px rgba(0,0,0,0.55)",
            }}
          >
            {/* Status bar */}
            <div
              className="relative flex items-center justify-between text-white/50"
              style={{
                padding: "6px 18px 2px",
                fontSize: 10,
              }}
            >
              <span style={{ fontWeight: 500 }}>9:41</span>
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  top: 0,
                  width: 72,
                  height: 22,
                  borderRadius: "0 0 14px 14px",
                  background: "#0c0f16",
                }}
              />
              <div className="flex items-center gap-1">
                {/* Signal */}
                <svg width="12" height="9" viewBox="0 0 15 11" fill="currentColor">
                  <rect x="0" y="8" width="2.5" height="3" rx="0.5" />
                  <rect x="4" y="5.5" width="2.5" height="5.5" rx="0.5" />
                  <rect x="8" y="3" width="2.5" height="8" rx="0.5" />
                  <rect x="12" y="0" width="2.5" height="11" rx="0.5" />
                </svg>
                {/* WiFi */}
                <svg width="11" height="9" viewBox="0 0 24 18" fill="currentColor">
                  <path d="M1 5.5C4.8 1.8 8.2 0 12 0s7.2 1.8 11 5.5l-2.2 2.2C17.8 4.8 15 3.2 12 3.2S6.2 4.8 3.2 7.7L1 5.5z" />
                  <path d="M5.5 10C7.3 8.2 9.5 7 12 7s4.7 1.2 6.5 3l-2.2 2.2C15 11 13.5 10.2 12 10.2s-3 .8-4.3 2L5.5 10z" />
                  <circle cx="12" cy="15.5" r="2" />
                </svg>
                {/* Battery */}
                <svg width="18" height="9" viewBox="0 0 28 13" fill="currentColor">
                  <rect x="0" y="0" width="24" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="2.5" y="2.5" width="19" height="8" rx="1.5" />
                  <rect x="25" y="4" width="3" height="5" rx="1" />
                </svg>
              </div>
            </div>

            {/* Screen content */}
            <div style={{ padding: "12px 10px 10px" }}>
              {/* Ready to research badge */}
              <div
                className="flex items-center gap-1.5"
                style={{ marginBottom: 12 }}
              >
                <span
                  style={{
                    width: 5,
                    height: 10,
                    borderRadius: 2,
                    background: "#22c55e",
                  }}
                />
                <span
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: 10,
                    fontWeight: 500,
                  }}
                >
                  Ready to research
                </span>
              </div>

              {/* Chat container */}
              <div
                style={{
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1.5px solid rgba(59, 130, 246, 0.35)",
                  background: "#1a2030",
                  marginBottom: 12,
                }}
              >
                {/* Chat bubbles */}
                <div style={{ padding: "14px 14px 12px", background: "#222d42" }}>
                  {/* User bubble */}
                  <div className="flex justify-end" style={{ marginBottom: 10 }}>
                    <div
                      className="flex items-center gap-1.5"
                      style={{
                        borderRadius: 20,
                        padding: "5px 10px",
                        border: "1px solid rgba(150, 160, 200, 0.12)",
                        background: "#1a2030",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 9,
                      }}
                    >
                      <span>how much do we spend per day?</span>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          background: "rgba(168,130,255,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: "50%",
                            background: "#a882ff",
                          }}
                        />
                      </span>
                    </div>
                  </div>

                  {/* AI bubble */}
                  <div className="flex items-start gap-1.5">
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "rgba(168,130,255,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#a882ff",
                        }}
                      />
                    </span>
                    <div
                      style={{
                        borderRadius: 10,
                        padding: "5px 10px",
                        border: "1px solid rgba(150, 160, 200, 0.12)",
                        background: "#1a2030",
                        color: "rgba(255,255,255,0.4)",
                        fontSize: 9,
                        lineHeight: 1.5,
                      }}
                    >
                      your biggest spend is employees, all costs results to
                      13,018$ per day
                    </div>
                  </div>
                </div>

                {/* Illustration + label */}
                <div
                  className="flex flex-col items-center"
                  style={{
                    padding: "28px 16px 24px",
                    background: "#141a26",
                  }}
                >
                  <img
                    src={researcherIllustration}
                    alt="Research documents illustration"
                    style={{
                      height: 100,
                      width: "auto",
                      objectFit: "contain",
                      marginBottom: 12,
                    }}
                  />
                  <h3
                    style={{
                      color: "#fff",
                      fontWeight: 600,
                      fontSize: 15,
                      marginBottom: 2,
                    }}
                  >
                    Researcher
                  </h3>
                  <p
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontSize: 11,
                    }}
                  >
                    Reveals what to do next
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                asChild
                className="w-full border-0"
                style={{
                  borderRadius: 10,
                  height: 40,
                  fontSize: 13,
                  fontWeight: 600,
                  background: "#3b82f6",
                  color: "#fff",
                }}
              >
                <Link to="/auth?mode=signup">Run AI CEO</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Trust badges */}
        <div
          className="flex items-center justify-center"
          style={{ gap: 28, fontSize: 13, color: "rgba(255,255,255,0.45)" }}
        >
          <div className="flex items-center gap-1.5">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#4ade80",
              }}
            />
            <span>No credit card</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#60a5fa",
              }}
            />
            <span>15-90 Seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiCeo;
