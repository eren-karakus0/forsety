import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Living Justice Design System
        navy: {
          50: "#f0f3f9",
          100: "#d9e0f0",
          200: "#b3c1e0",
          300: "#8da2d1",
          400: "#6783c1",
          500: "#4164b2",
          600: "#34508e",
          700: "#273c6b",
          800: "#1a2847",
          900: "#0d1424",
          950: "#070a12",
        },
        gold: {
          50: "#fdf9ef",
          100: "#faf0d4",
          200: "#f5e0a8",
          300: "#f0d07d",
          400: "#ebc051",
          500: "#d4a832",
          600: "#b08a28",
          700: "#8c6d1f",
          800: "#685015",
          900: "#44330e",
          950: "#221a07",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
      },
    },
  },
  plugins: [animate, typography],
};

export default config;
