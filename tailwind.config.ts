import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        btc: {
          orange: "#F7931A",
          "orange-light": "#FFB347",
          "orange-dark": "#C76B00",
        },
        sovereign: {
          black: "#0A0A0A",
          dark: "#111111",
          panel: "#1A1A1A",
          border: "#2A2A2A",
          muted: "#666666",
          text: "#E5E5E5",
          white: "#FAFAFA",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(247, 147, 26, 0.2)" },
          "100%": { boxShadow: "0 0 20px rgba(247, 147, 26, 0.4)" },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
