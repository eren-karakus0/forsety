import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@forsety/ui";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Forsety | Evidence Layer for Licensed AI Data Access",
    template: "%s | Forsety",
  },
  description:
    "Cryptographic evidence packs that verify every dataset interaction. Prove licensed access and compliant usage with Forsety, built on Shelby Protocol.",
  keywords: [
    "AI compliance",
    "data licensing",
    "evidence pack",
    "Shelby Protocol",
    "MCP",
    "dataset verification",
  ],
  authors: [{ name: "Forsety", url: "https://github.com/Forsetyxyz" }],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon", type: "image/png", sizes: "32x32" },
    ],
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://forsety.xyz"),
  openGraph: {
    title: "Forsety | Evidence Layer for Licensed AI Data Access",
    description:
      "Cryptographic evidence packs that verify every dataset interaction. Built on Shelby Protocol & Aptos.",
    type: "website",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Forsety" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Forsety | Evidence Layer for Licensed AI Data Access",
    description:
      "Cryptographic evidence packs that verify every dataset interaction. Built on Shelby Protocol & Aptos.",
    images: ["/opengraph-image"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdrs = await headers();
  const nonce = hdrs.get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
        {process.env.NEXT_PUBLIC_UMAMI_URL && process.env.NEXT_PUBLIC_UMAMI_ID && (
          <Script
            src={process.env.NEXT_PUBLIC_UMAMI_URL}
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_ID}
            strategy="afterInteractive"
            nonce={nonce}
          />
        )}
      </body>
    </html>
  );
}
