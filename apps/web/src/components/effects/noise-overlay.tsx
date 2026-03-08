export function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{ opacity: 0.03, mixBlendMode: "overlay" }}
    >
      <svg width="100%" height="100%">
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.65"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
  );
}
