import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "6px",
          background: "#273C6B",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
          <path
            d="M20 6L20 34M20 10L12 18M20 10L28 18"
            stroke="#D4AF37"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size }
  );
}
