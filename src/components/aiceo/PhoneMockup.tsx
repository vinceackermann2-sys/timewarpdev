import React from "react";
import { Battery, Wifi, Signal, FileText } from "lucide-react";

export function PhoneMockup() {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 340,
        background: "#1a1f2e",
        borderRadius: 42,
        padding: "7px",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.08), 0 50px 120px -20px rgba(0,0,0,0.7)",
      }}
    >
      {/* Notch */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: 7,
          width: 100,
          height: 28,
          borderRadius: "0 0 18px 18px",
          background: "#0f131c",
          zIndex: 20,
        }}
      />

      {/* Screen */}
      <div
        style={{
          background: "#0f131c",
          borderRadius: 35,
          overflow: "hidden",
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
        <div style={{ padding: "10px 18px 18px" }}>
          {/* Ready to research indicator */}
          <div
            className="flex items-center gap-2"
            style={{ marginBottom: 18 }}
          >
            <span
              style={{
                width: 7,
                height: 14,
                borderRadius: 3.5,
                background: "#22c55e",
              }}
            />
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
                  <span
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: 11.5,
                      lineHeight: 1.4,
                    }}
                  >
                    how much do we spend per day?
                  </span>
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
              <div className="flex items-start gap-2.5">
                <span
                  style={{
                    width: 22,
                    height: 22,
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
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "#a882ff",
                    }}
                  />
                </span>
                <div
                  style={{
                    borderRadius: 14,
                    padding: "10px 14px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.05)",
                    color: "rgba(255,255,255,0.45)",
                    fontSize: 11.5,
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
                padding: "40px 24px 34px",
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
                    left: 8,
                    top: 14,
                    borderRadius: 7,
                    background:
                      "linear-gradient(145deg, #2a3550 0%, #1e2840 100%)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    transform: "rotate(-8deg)",
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
                    right: 8,
                    top: 10,
                    borderRadius: 7,
                    background:
                      "linear-gradient(145deg, #2e3a58 0%, #222e48 100%)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    transform: "rotate(6deg)",
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
                    left: "50%",
                    top: 4,
                    transform: "translateX(-50%)",
                    borderRadius: 8,
                    background:
                      "linear-gradient(145deg, #323e60 0%, #283450 100%)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    zIndex: 2,
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
              <h3
                style={{
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 18,
                  marginBottom: 4,
                  letterSpacing: "-0.01em",
                }}
              >
                Researcher
              </h3>
              <p
                style={{
                  color: "rgba(255,255,255,0.35)",
                  fontSize: 13,
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
          </button>
        </div>
      </div>
    </div>
  );
}
