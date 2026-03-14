import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Forsety | Evidence Layer for Licensed AI Data Access";
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
          background: "linear-gradient(135deg, #0A1628 0%, #0F1B2E 40%, #0A1628 70%, #0D1424 100%)",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gold gradient orb */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "-120px",
            width: "450px",
            height: "450px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 70%)",
          }}
        />
        {/* Teal gradient orb */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(55,170,212,0.08) 0%, transparent 70%)",
          }}
        />

        {/* Tiwaz rune icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "88px",
            height: "88px",
            borderRadius: "18px",
            background: "linear-gradient(135deg, #1a2847 0%, #273C6B 100%)",
            border: "1px solid rgba(212,175,55,0.25)",
            marginBottom: "36px",
          }}
        >
          <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
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
            color: "#FFFFFF",
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
            color: "rgba(255,255,255,0.55)",
            textAlign: "center",
            marginTop: "20px",
            maxWidth: "700px",
            display: "flex",
          }}
        >
          Cryptographic proof of compliant data access, built on Shelby Protocol &amp; Aptos
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
            border: "1px solid rgba(212,175,55,0.20)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div
            style={{
              fontSize: "16px",
              color: "rgba(212,175,55,0.7)",
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
