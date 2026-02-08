import React, { useState, useCallback, useEffect, useRef } from "react";
import { Battery, Wifi, Signal, FileText, Check, ArrowRight } from "lucide-react";
import { TypingAnimation } from "@/components/ui/typing-animation";
export function PhoneMockup() {
  const [loopKey, setLoopKey] = useState(0);
  const [firstDone, setFirstDone] = useState(false);
  const [researched, setResearched] = useState(false);
  const [scanActive, setScanActive] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [secondDone, setSecondDone] = useState(false);
  const [showThirdMsg, setShowThirdMsg] = useState(false);
  const [thirdDone, setThirdDone] = useState(false);
  const [showFourthMsg, setShowFourthMsg] = useState(false);
  const [secondScanActive, setSecondScanActive] = useState(false);
  const [secondResearched, setSecondResearched] = useState(false);
  const [showActionButtons, setShowActionButtons] = useState(false);
  const [fourthDone, setFourthDone] = useState(false);
  const [showFifthMsg, setShowFifthMsg] = useState(false);
  const [togglesOff, setTogglesOff] = useState([false, false, false]);
  const [showGlare, setShowGlare] = useState(false);
  const handleFirstComplete = useCallback(() => setFirstDone(true), []);
  const handleSecondComplete = useCallback(() => setSecondDone(true), []);
  const handleThirdComplete = useCallback(() => setThirdDone(true), []);
  const handleFourthComplete = useCallback(() => setFourthDone(true), []);

   useEffect(() => {
    if (firstDone) {
      const scanTimer = setTimeout(() => setScanActive(true), 400);
      const structureTimer = setTimeout(() => setResearched(true), 4200);
      const responseTimer = setTimeout(() => setShowResponse(true), 4600);
      return () => {
        clearTimeout(scanTimer);
        clearTimeout(structureTimer);
        clearTimeout(responseTimer);
      };
    }
  }, [firstDone]);

  // After text 2 finishes, show text 3 after a brief pause
  useEffect(() => {
    if (secondDone) {
      const timer = setTimeout(() => setShowThirdMsg(true), 600);
      return () => clearTimeout(timer);
    }
  }, [secondDone]);

  // After text 3 finishes, trigger second scan, then show results + text 4
  useEffect(() => {
    if (thirdDone) {
      const scanTimer = setTimeout(() => setSecondScanActive(true), 400);
      const researchTimer = setTimeout(() => setSecondResearched(true), 4200);
      const buttonsTimer = setTimeout(() => setShowActionButtons(true), 4400);
      const responseTimer = setTimeout(() => setShowFourthMsg(true), 4600);
      return () => {
        clearTimeout(scanTimer);
        clearTimeout(researchTimer);
        clearTimeout(buttonsTimer);
        clearTimeout(responseTimer);
      };
    }
  }, [thirdDone]);

  // After text 4 finishes, show text 5 "yes" and toggle off buttons one by one
  useEffect(() => {
    if (fourthDone) {
      const fifthTimer = setTimeout(() => setShowFifthMsg(true), 600);
      const t1 = setTimeout(() => setTogglesOff(prev => [true, prev[1], prev[2]]), 1200);
      const t2 = setTimeout(() => setTogglesOff(prev => [prev[0], true, prev[2]]), 1600);
      const t3 = setTimeout(() => setTogglesOff(prev => [prev[0], prev[1], true]), 2000);
      const glareTimer = setTimeout(() => setShowGlare(true), 2600);
      const resetTimer = setTimeout(() => {
        // Reset all states
        setFirstDone(false);
        setResearched(false);
        setScanActive(false);
        setShowResponse(false);
        setSecondDone(false);
        setShowThirdMsg(false);
        setThirdDone(false);
        setShowFourthMsg(false);
        setSecondScanActive(false);
        setSecondResearched(false);
        setShowActionButtons(false);
        setFourthDone(false);
        setShowFifthMsg(false);
        setTogglesOff([false, false, false]);
        setShowGlare(false);
        setLoopKey(prev => prev + 1);
      }, 4200);
      return () => {
        clearTimeout(fifthTimer);
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(glareTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [fourthDone]);
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
            className="flex flex-col flex-1"
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
                      key={loopKey}
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
                    onComplete={handleSecondComplete}
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

              {/* User Message 2 (Text 3) */}
              {showThirdMsg && (
                <div
                  className="flex justify-end"
                  style={{ marginTop: 14 }}
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
                      text="i need to cut that spending"
                      duration={50}
                      onComplete={handleThirdComplete}
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
              )}

              {/* AI Response 2 (Text 4) */}
              {showFourthMsg && (
                <div
                  className="flex items-start gap-2.5"
                  style={{
                    borderRadius: 14,
                    padding: "6px 10px",
                    marginTop: 14,
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
                  <TypingAnimation
                    text="you have 23 active subscriptions, want me to remove any?"
                    duration={30}
                    onComplete={handleFourthComplete}
                    style={{
                      color: "rgba(255,255,255,0.45)",
                      fontSize: 11,
                      lineHeight: 1.4,
                      textAlign: "left" as const,
                      fontWeight: 400,
                    }}
                  />
                </div>
              )}

              {/* User Message 3 (Text 5) */}
              {showFifthMsg && (
                <div
                  className="flex justify-end"
                  style={{ marginTop: 14 }}
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
                      text="yes"
                      duration={50}
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
              )}
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

              {/* Scan Line - First */}
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

              {/* Scan Line - Second */}
              {secondScanActive && !secondResearched && (
                <div
                  className="absolute"
                  style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    zIndex: 10,
                    background: "linear-gradient(90deg, transparent 0%, rgba(34, 197, 94, 0.8) 40%, rgba(16, 185, 129, 1) 50%, rgba(34, 197, 94, 0.8) 60%, transparent 100%)",
                    boxShadow: "0 0 12px 3px rgba(34, 197, 94, 0.4), 0 0 30px 6px rgba(16, 185, 129, 0.15)",
                    animation: "scanBounce 3.6s ease-in-out forwards",
                  }}
                />
              )}

              <style>{`
                @keyframes scanBounce {
                  0% { top: 0%; opacity: 0; }
                  2% { opacity: 1; }
                  25% { top: 100%; }
                  50% { top: 0%; }
                  75% { top: 100%; }
                  95% { top: 0%; opacity: 1; }
                  100% { top: 0%; opacity: 0; }
                }
                @keyframes buttonGlare {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(100%); }
                }
              `}</style>

              {/* Stacked Papers */}
              <div
                className="relative"
                style={{
                  width: secondResearched ? 180 : 150,
                  height: secondResearched ? 140 : 125,
                  marginBottom: 12,
                  transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
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
                    ...(secondResearched
                      ? { left: -10, top: 30, transform: "rotate(-12deg) scale(0.7)", opacity: 0.4 }
                      : researched
                      ? { left: 8, top: 14, transform: "rotate(-8deg)" }
                      : { left: -2, top: 25, transform: "rotate(-18deg) translateY(5px)" }),
                  }}
                >
                  <div
                    style={{ padding: 10 }}
                    className="flex flex-col gap-2"
                  >
                    <div style={{ height: 3.5, width: "80%", borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
                    <div style={{ height: 3.5, width: "60%", borderRadius: 2, background: "rgba(255,255,255,0.06)" }} />
                    <div style={{ height: 3.5, width: "70%", borderRadius: 2, background: "rgba(255,255,255,0.05)" }} />
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
                    ...(secondResearched
                      ? { right: -10, top: 30, left: "auto", transform: "rotate(10deg) scale(0.7)", opacity: 0.4 }
                      : researched
                      ? { right: 8, top: 10, left: "auto", transform: "rotate(6deg)" }
                      : { right: -4, top: 22, left: "auto", transform: "rotate(15deg) translateY(8px)" }),
                  }}
                >
                  <div
                    style={{ padding: 10 }}
                    className="flex flex-col gap-2"
                  >
                    <div style={{ height: 3.5, width: "75%", borderRadius: 2, background: "rgba(255,255,255,0.08)" }} />
                    <div style={{ height: 3.5, width: "55%", borderRadius: 2, background: "rgba(255,255,255,0.06)" }} />
                  </div>
                </div>

                {/* Paper 3 (Front - becomes large) */}
                <div
                  className="absolute"
                  style={{
                    borderRadius: secondResearched ? 10 : 8,
                    background: secondResearched
                      ? "linear-gradient(145deg, #1e3a2a 0%, #1a3025 100%)"
                      : "linear-gradient(145deg, #323e60 0%, #283450 100%)",
                    border: secondResearched
                      ? "1px solid rgba(34, 197, 94, 0.3)"
                      : "1px solid rgba(255,255,255,0.1)",
                    zIndex: 2,
                    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s",
                    ...(secondResearched
                      ? { left: "50%", top: 0, transform: "translateX(-50%) rotate(0deg)", width: 120, height: 130 }
                      : researched
                      ? { left: "50%", top: 4, transform: "translateX(-50%) rotate(0deg)", width: 74, height: 95 }
                      : { left: "50%", top: 12, transform: "translateX(-50%) rotate(4deg) translateY(6px)", width: 74, height: 95 }),
                  }}
                >
                  <div
                    style={{ padding: secondResearched ? 14 : 12 }}
                    className="flex flex-col gap-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <FileText
                        size={secondResearched ? 14 : 12}
                        style={{ color: secondResearched ? "rgba(34, 197, 94, 0.6)" : "rgba(255,255,255,0.3)" }}
                      />
                      <div style={{ height: 3.5, width: "60%", borderRadius: 2, background: secondResearched ? "rgba(34, 197, 94, 0.2)" : "rgba(255,255,255,0.12)" }} />
                    </div>
                    <div style={{ height: 3.5, width: "80%", borderRadius: 2, background: secondResearched ? "rgba(34, 197, 94, 0.15)" : "rgba(255,255,255,0.08)" }} />
                    <div style={{ height: 3.5, width: "65%", borderRadius: 2, background: secondResearched ? "rgba(34, 197, 94, 0.1)" : "rgba(255,255,255,0.06)" }} />
                    {secondResearched && (
                      <>
                        <div style={{ height: 3.5, width: "90%", borderRadius: 2, background: "rgba(34, 197, 94, 0.12)" }} />
                        <div style={{ height: 3.5, width: "50%", borderRadius: 2, background: "rgba(34, 197, 94, 0.08)" }} />
                      </>
                    )}
                  </div>
                </div>

                {/* Floating accents */}
                <div
                  className="absolute"
                  style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: secondResearched ? "rgba(34, 197, 94, 0.3)" : "rgba(99, 102, 241, 0.3)",
                    top: 0, right: 18, filter: "blur(2px)",
                    transition: "background 0.6s ease",
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: secondResearched ? "rgba(16, 185, 129, 0.25)" : "rgba(59, 130, 246, 0.25)",
                    bottom: 10, left: 14, filter: "blur(1px)",
                    transition: "background 0.6s ease",
                  }}
                />
              </div>

              {/* Toggle Switches */}
              {showActionButtons && (
                <div
                  className="flex gap-3 animate-fade-in"
                  style={{ marginTop: 4 }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 30,
                        height: 16,
                        borderRadius: 14,
                        background: togglesOff[i] ? "rgba(239, 68, 68, 0.5)" : "rgba(34, 197, 94, 0.7)",
                        position: "relative",
                        flexShrink: 0,
                        boxShadow: togglesOff[i] ? "0 0 6px rgba(239, 68, 68, 0.3)" : "0 0 6px rgba(34, 197, 94, 0.3)",
                        transition: "all 0.4s ease",
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          background: "#fff",
                          position: "absolute",
                          top: 2,
                          right: togglesOff[i] ? "auto" : 2,
                          left: togglesOff[i] ? 2 : "auto",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                          transition: "all 0.4s ease",
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Labels */}
            </div>
          </div>

          {/* CTA Button */}
          <button
            className="w-full flex items-center justify-center gap-2"
            style={{
              borderRadius: 14,
              height: 52,
              minHeight: 52,
              fontSize: 15,
              fontWeight: 700,
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              letterSpacing: "0.01em",
              marginTop: "auto",
              position: "relative",
              overflow: "hidden",
            }}
            onClick={() =>
              (window.location.href = "/auth?mode=signup")
            }
          >
            {showGlare && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
                  animation: "buttonGlare 0.8s ease-in-out forwards",
                  pointerEvents: "none",
                }}
              />
            )}
            Run AI CEO
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}
