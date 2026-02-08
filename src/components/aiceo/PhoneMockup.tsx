import React from "react";
import { Battery, Wifi, Signal, FileText, CheckCircle2 } from "lucide-react";

export function PhoneMockup() {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 280,
        background: "#1a1f2e",
        borderRadius: 36,
        padding: "6px",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.08), 0 40px 100px -20px rgba(0,0,0,0.7)",
      }}
    >
      {/* Notch */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: 6,
          width: 90,
          height: 24,
          borderRadius: "0 0 16px 16px",
          background: "#0f131c",
          zIndex: 20,
        }}
      />

      {/* Screen */}
      <div
        style={{
          background: "#0f131c",
          borderRadius: 30,
          overflow: "hidden",
        }}
      >
        {/* Status Bar */}
        <div
          className="relative flex items-center justify-between"
          style={{
            padding: "12px 20px 6px",
            fontSize: 11,
            fontWeight: 600,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <Signal size={12} strokeWidth={2.5} />
            <Wifi size={12} strokeWidth={2.5} />
            <Battery size={14} strokeWidth={2.5} />
          </div>
        </div>

        {/* Main Content */}
        <div style={{ padding: "8px 14px 14px" }}>
          {/* Ready to research indicator */}
          <div
            className="flex items-center gap-2"
            style={{ marginBottom: 14 }}
          >
            <span
              style={{
                width: 6,
                height: 12,
                borderRadius: 3,
                background: "#22c55e",
              }}
            />
            <span
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 11,
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
              borderRadius: 16,
              overflow: "hidden",
              border: "1px solid rgba(59, 130, 246, 0.25)",
              background: "#141a28",
              marginBottom: 14,
            }}
          >
            {/* Chat Area */}
            <div
              style={{
                padding: "16px",
                background:
                  "linear-gradient(180deg, #1e2a42 0%, #1a2438 100%)",
              }}
            >
              {/* User Message */}
              <div
                className="flex justify-end"
                style={{ marginBottom: 12 }}
              >
                <div
                  className="flex items-center gap-2"
                  style={{
                    borderRadius: 20,
                    padding: "7px 12px",
                    background: "rgba(30, 40, 65, 0.8)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    maxWidth: "85%",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 10,
                      lineHeight: 1.4,
                    }}
                  >
                    how much do we spend per day?
                  </span>
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
                </div>
              </div>

              {/* AI Response */}
              <div className="flex items-start gap-2">
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "rgba(168,130,255,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#a882ff",
                    }}
                  />
                </span>
                <div
                  style={{
                    borderRadius: 12,
                    padding: "8px 12px",
                    background: "rgba(20, 28, 48, 0.8)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 10,
                    lineHeight: 1.6,
                  }}
                >
                  your biggest spend is employees, all costs results to{" "}
                  <span style={{ color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                    13,018$ per day
                  </span>
                </div>
              </div>
            </div>

            {/* Illustration Area */}
            <div
              className="relative flex flex-col items-center"
              style={{
                padding: "32px 20px 28px",
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
                  width: 120,
                  height: 80,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(ellipse, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
                  filter: "blur(20px)",
                }}
              />

              {/* Stacked Papers */}
              <div
                className="relative"
                style={{
                  width: 120,
                  height: 100,
                  marginBottom: 16,
                }}
              >
                {/* Paper 1 (Back) */}
                <div
                  className="absolute"
                  style={{
                    width: 56,
                    height: 72,
                    left: 6,
                    top: 12,
                    borderRadius: 6,
                    background:
                      "linear-gradient(145deg, #2a3550 0%, #1e2840 100%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    transform: "rotate(-8deg)",
                  }}
                >
                  <div
                    style={{ padding: 8 }}
                    className="flex flex-col gap-1.5"
                  >
                    <div
                      style={{
                        height: 3,
                        width: "80%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.08)",
                      }}
                    />
                    <div
                      style={{
                        height: 3,
                        width: "60%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.06)",
                      }}
                    />
                    <div
                      style={{
                        height: 3,
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
                    width: 56,
                    height: 72,
                    right: 6,
                    top: 8,
                    borderRadius: 6,
                    background:
                      "linear-gradient(145deg, #2e3a58 0%, #222e48 100%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    transform: "rotate(6deg)",
                  }}
                >
                  <div
                    style={{ padding: 8 }}
                    className="flex flex-col gap-1.5"
                  >
                    <div
                      style={{
                        height: 3,
                        width: "75%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.08)",
                      }}
                    />
                    <div
                      style={{
                        height: 3,
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
                    width: 60,
                    height: 76,
                    left: "50%",
                    top: 4,
                    transform: "translateX(-50%)",
                    borderRadius: 7,
                    background:
                      "linear-gradient(145deg, #323e60 0%, #283450 100%)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{ padding: 10 }}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText
                        size={10}
                        style={{ color: "rgba(255,255,255,0.3)" }}
                      />
                      <div
                        style={{
                          height: 3,
                          width: "60%",
                          borderRadius: 2,
                          background: "rgba(255,255,255,0.12)",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        height: 3,
                        width: "80%",
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.08)",
                      }}
                    />
                    <div
                      style={{
                        height: 3,
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
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "rgba(99, 102, 241, 0.3)",
                    top: 0,
                    right: 16,
                    filter: "blur(2px)",
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "rgba(59, 130, 246, 0.25)",
                    bottom: 8,
                    left: 12,
                    filter: "blur(1px)",
                  }}
                />
              </div>

              {/* Labels */}
              <h3
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 16,
                  marginBottom: 3,
                  letterSpacing: "-0.01em",
                }}
              >
                Researcher
              </h3>
              <p
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 11.5,
                  fontWeight: 400,
                }}
              >
                Reveals what to do next
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            className="w-full"
            style={{
              borderRadius: 12,
              height: 44,
              fontSize: 13.5,
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
          </button>
        </div>
      </div>
    </div>
  );
}
