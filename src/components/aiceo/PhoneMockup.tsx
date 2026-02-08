import React, { useState, useCallback, useEffect } from "react";
import { Battery, Wifi, Signal, FileText, Check, ArrowRight } from "lucide-react";
import { TypingAnimation } from "@/components/ui/typing-animation";
export function PhoneMockup() {
  const [firstDone, setFirstDone] = useState(false);
  const [researched, setResearched] = useState(false);
  const [scanActive, setScanActive] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const handleFirstComplete = useCallback(() => setFirstDone(true), []);

  useEffect(() => {
    if (firstDone) {
      // Start scan line after a brief delay
      const scanTimer = setTimeout(() => setScanActive(true), 400);
      // Papers become structured after 2 bounces (~3.6s animation)
      const structureTimer = setTimeout(() => setResearched(true), 4200);
      // Show AI response text only after research is done
      const responseTimer = setTimeout(() => setShowResponse(true), 4600);
      return () => {
        clearTimeout(scanTimer);
        clearTimeout(structureTimer);
        clearTimeout(responseTimer);
      };
    }
  }, [firstDone]);
  return (
    <div
      className="relative mx-auto flex items-center justify-center"
      style={{ width: "100%", minHeight: "100%" }}
    >
    <div
      className="relative flex flex-col"
      style={{
        width: 400,
        height: 700,
        background: "#1a1f2e",
        borderRadius: 48,
        padding: "8px",
        boxShadow:
          "0 0 0 2px #000, 0 50px 120px -20px rgba(0,0,0,0.7)",
      }}
    >
      {/* Notch */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: 14,
          width: 110,
          height: 30,
          borderRadius: 28,
          background: "#000",
          zIndex: 20,
        }}
      />

      {/* Screen */}
      <div
        className="flex flex-col"
        style={{
          background: "#0f131c",
          borderRadius: 40,
          overflow: "hidden",
          height: "100%",
        }}
      >
        {/* Status Bar */}
        <div
          className="relative flex items-center justify-between"
          style={{
            padding: "14px 24px 8px",
            fontSize: 12,
            fontWeight: 600,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <Signal size={13} strokeWidth={2.5} />
            <Wifi size={13} strokeWidth={2.5} />
            <Battery size={15} strokeWidth={2.5} />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-col flex-1" style={{ padding: "10px 18px 18px" }}>
          {/* Ready to research indicator */}
          <div
            className="flex items-center gap-2"
            style={{ marginBottom: 18 }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.65)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Check size={11} strokeWidth={3} style={{ color: "#22c55e" }} />
            </span>
            <span
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 12.5,
                fontWeight: 500,
                letterSpacing: "0.01em",
              }}
            >
              Ready to research
            </span>
          </div>

          {/* Main Card */}
          <div
            style={{
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              background: "#141a28",
              marginBottom: 18,
            }}
          >
            {/* Chat Area */}
            <div
              style={{
                padding: "20px",
                background:
                  "linear-gradient(180deg, #1e2a42 0%, #1a2438 100%)",
              }}
            >
              {/* User Message */}
              <div
                className="flex justify-end"
                style={{ marginBottom: 14 }}
              >
                <div
                  className="flex items-center gap-2.5"
                  style={{
                    borderRadius: 14,
                    padding: "7px 12px",
                    background: "rgba(30, 40, 65, 0.8)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    whiteSpace: "nowrap",
                  }}
                >
                   <TypingAnimation
                      text="how much do we spend per day?"
                      duration={50}
                      onComplete={handleFirstComplete}
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11.5,
                        lineHeight: 1.4,
                      }}
                    />
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: "linear-gradient(to right, #605aaf, #bb90d4)",
                      flexShrink: 0,
                    }}
                  />
                </div>
              </div>

              {/* AI Response */}
              <div
                className="flex items-start gap-2.5"
                style={{
                  borderRadius: 14,
                  padding: "6px 10px",
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.05)",
                  width: "100%",
                }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: "linear-gradient(to right, #605aaf, #bb90d4)",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                />
                {showResponse ? (
                  <TypingAnimation
                    text="your biggest spend is employees, all costs results to 13,018$ per day"
                    duration={30}
                    style={{
                      color: "rgba(255,255,255,0.45)",
                      fontSize: 11,
                      lineHeight: 1.4,
                      textAlign: "left" as const,
                      fontWeight: 400,
                    }}
                  />
                ) : null}
              </div>
            </div>

            {/* Illustration Area */}
            <div
              className="relative flex flex-col items-center justify-center flex-1"
              style={{
                padding: "24px",
                background: "#0f1520",
              }}
            >
              {/* Background glow */}
              <div
                className="absolute"
                style={{
                  top: "30%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: 150,
                  height: 100,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
                  filter: "blur(24px)",
                }}
              />

              {/* Scan Line */}
              {scanActive && (
                <div
                  className="absolute"
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    zIndex: 10,
                    background: "linear-gradient(90deg, transparent 0%, rgba(99, 102, 241, 0.8) 40%, rgba(59, 130, 246, 1) 50%, rgba(99, 102, 241, 0.8) 60%, transparent 100%)",
                    boxShadow: "0 0 12px 3px rgba(99, 102, 241, 0.4), 0 0 30px 6px rgba(59, 130, 246, 0.15)",
                    animation: "scanBounce 3.6s ease-in-out forwards",
                  }}
                />
              )}

              <style>{`
                @keyframes scanBounce {
                  0% { top: 0%; opacity: 0; }
                  2% { opacity: 1; }
                  /* First pass down */
                  25% { top: 100%; }
                  /* First pass up */
                  50% { top: 0%; }
                  /* Second pass down */
                  75% { top: 100%; }
                  /* Second pass up */
                  95% { top: 0%; opacity: 1; }
                  100% { top: 0%; opacity: 0; }
                }
              `}</style>

              {/* Stacked Papers */}
              <div
                className="relative"
                style={{
                  width: 150,
                  height: 125,
                  marginBottom: 20,
                }}
              >
                {/* Paper 1 (Back) */}
                <div
                  className="absolute"
                  style={{
                    width: 70,
                    height: 90,
                    borderRadius: 7,
                    background:
                      "linear-gradient(145deg, #2a3550 0%, #1e2840 100%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    ...(researched
                      ? { left: 8, top: 14, transform: "rotate(-8deg)" }
                      : { left: -2, top: 25, transform: "rotate(-18deg) translateY(5px)" }),
                  }}
                >
                  <div
                    style={{ padding: 10 }}
                    className="flex flex-col gap-2"
                  >
                    <div
                      style={{
                        height: 3.5,
                        width: "80%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.08)",
                      }}
                    />
                    <div
                      style={{
                        height: 3.5,
                        width: "60%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.06)",
                      }}
                    />
                    <div
                      style={{
                        height: 3.5,
                        width: "70%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.05)",
                      }}
                    />
                  </div>
                </div>

                {/* Paper 2 (Middle) */}
                <div
                  className="absolute"
                  style={{
                    width: 70,
                    height: 90,
                    borderRadius: 7,
                    background:
                      "linear-gradient(145deg, #2e3a58 0%, #222e48 100%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s",
                    ...(researched
                      ? { right: 8, top: 10, left: "auto", transform: "rotate(6deg)" }
                      : { right: -4, top: 22, left: "auto", transform: "rotate(15deg) translateY(8px)" }),
                  }}
                >
                  <div
                    style={{ padding: 10 }}
                    className="flex flex-col gap-2"
                  >
                    <div
                      style={{
                        height: 3.5,
                        width: "75%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.08)",
                      }}
                    />
                    <div
                      style={{
                        height: 3.5,
                        width: "55%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.06)",
                      }}
                    />
                  </div>
                </div>

                {/* Paper 3 (Front) */}
                <div
                  className="absolute"
                  style={{
                    width: 74,
                    height: 95,
                    borderRadius: 8,
                    background:
                      "linear-gradient(145deg, #323e60 0%, #283450 100%)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    zIndex: 2,
                    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s",
                    ...(researched
                      ? { left: "50%", top: 4, transform: "translateX(-50%) rotate(0deg)" }
                      : { left: "50%", top: 12, transform: "translateX(-50%) rotate(4deg) translateY(6px)" }),
                  }}
                >
                  <div
                    style={{ padding: 12 }}
                    className="flex flex-col gap-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <FileText
                        size={12}
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      />
                      <div
                        style={{
                          height: 3.5,
                          width: "60%",
                          borderRadius: 2,
                          background: "rgba(255,255,255,0.12)",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        height: 3.5,
                        width: "80%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.08)",
                      }}
                    />
                    <div
                      style={{
                        height: 3.5,
                        width: "65%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.06)",
                      }}
                    />
                  </div>
                </div>

                {/* Floating accents */}
                <div
                  className="absolute"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "rgba(99, 102, 241, 0.3)",
                    top: 0,
                    right: 18,
                    filter: "blur(2px)",
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "rgba(59, 130, 246, 0.25)",
                    bottom: 10,
                    left: 14,
                    filter: "blur(1px)",
                  }}
                />
              </div>

              {/* Labels */}
            </div>
          </div>

          {/* CTA Button */}
          <button
            className="w-full flex items-center justify-center gap-2"
            style={{
              borderRadius: 14,
              height: 52,
              fontSize: 15,
              fontWeight: 700,
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.01em",
            }}
            onClick={() =>
              (window.location.href = "/auth?mode=signup")
            }
          >
            Run AI CEO
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
