import { useNavigate } from "react-router-dom";

export default function TimewarpOG() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #05070f 0%, #0d1528 50%, #05070f 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Badge */}
      <div
        style={{
          padding: "6px 16px",
          borderRadius: 20,
          background: "rgba(99, 102, 241, 0.15)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          marginBottom: 32,
        }}
      >
        <span
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "hsl(var(--primary))",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Exclusive Early Access
        </span>
      </div>

      {/* Title */}
      <h1
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: "clamp(48px, 7vw, 80px)",
          fontWeight: 900,
          color: "#fff",
          textAlign: "center",
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          marginBottom: 16,
        }}
      >
        TimeWarp{" "}
        <span className="text-primary">OG</span>
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 18,
          color: "rgba(255,255,255,0.45)",
          textAlign: "center",
          maxWidth: 460,
          lineHeight: 1.6,
          marginBottom: 48,
        }}
      >
        Coming soon. Stay tuned.
      </p>

      {/* Back button */}
      <button
        onClick={() => navigate("/ai-ceo")}
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          color: "rgba(255,255,255,0.5)",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 12,
          padding: "10px 24px",
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          e.currentTarget.style.color = "rgba(255,255,255,0.8)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(255,255,255,0.06)";
          e.currentTarget.style.color = "rgba(255,255,255,0.5)";
        }}
      >
        ← Back
      </button>
    </div>
  );
}
