const NOISE_SVG = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="256" height="256" filter="url(#n)"/></svg>`
)}`;

export function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        opacity: 0.03,
        mixBlendMode: "overlay",
        backgroundImage: `url("${NOISE_SVG}")`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      }}
    />
  );
}
