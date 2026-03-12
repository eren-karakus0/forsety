import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Forsety",
    short_name: "Forsety",
    description:
      "Evidence Layer for Licensed AI Data Access. Cryptographic proof of compliant data usage.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A1628",
    theme_color: "#273C6B",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
