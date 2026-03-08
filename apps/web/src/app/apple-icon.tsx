import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "36px",
          background: "linear-gradient(135deg, #1a2847 0%, #273C6B 100%)",
        }}
      >
        <svg width="100" height="100" viewBox="0 0 40 40" fill="none">
          <path
            d="M20 6L20 34M20 10L12 18M20 10L28 18"
            stroke="#D4AF37"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
