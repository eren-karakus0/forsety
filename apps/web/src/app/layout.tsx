import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@forsety/ui";
import { Providers } from "./providers";
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
    default: "Forsety — Evidence Layer for Licensed AI Data Access",
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
  authors: [{ name: "eren-karakus0" }],
  openGraph: {
    title: "Forsety — Evidence Layer for Licensed AI Data Access",
    description:
      "Cryptographic evidence packs that verify every dataset interaction. Built on Shelby Protocol.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Forsety — Evidence Layer for Licensed AI Data Access",
    description:
      "Cryptographic evidence packs that verify every dataset interaction. Built on Shelby Protocol.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
