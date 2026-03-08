import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Forsety — Evidence Layer for Licensed AI Data Access";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #f0f3f9 0%, #ffffff 30%, #f0f3f9 60%, #d1f0f5 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold gradient orb */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)",
          }}
        />
        {/* Teal gradient orb */}
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            right: "-80px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(55,170,212,0.10) 0%, transparent 70%)",
          }}
        />

        {/* Tiwaz rune icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "80px",
            height: "80px",
            borderRadius: "16px",
            background: "#1a2847",
            marginBottom: "32px",
          }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path
              d="M20 6L20 34M20 10L12 18M20 10L28 18"
              stroke="#D4AF37"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "56px",
            fontWeight: 800,
            letterSpacing: "-0.03em",
            color: "#0d1424",
            textAlign: "center",
            lineHeight: 1.1,
            maxWidth: "900px",
            display: "flex",
          }}
        >
          Evidence Layer for Licensed AI Data
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "22px",
            color: "#4164b2",
            textAlign: "center",
            marginTop: "20px",
            maxWidth: "700px",
            display: "flex",
          }}
        >
          Cryptographic proof of compliant data access. Built on Shelby Protocol.
        </div>

        {/* Bottom badge */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 20px",
            borderRadius: "999px",
            border: "1px solid #d9e0f0",
            background: "#f0f3f9",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              color: "#6783c1",
              display: "flex",
            }}
          >
            forsety.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
