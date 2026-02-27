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
        bg: {
          base: "#080808",
          surface: "#111111",
          elevated: "#1a1a1a",
          overlay: "#242424",
        },
        border: {
          subtle: "rgba(255,255,255,0.04)",
          default: "rgba(255,255,255,0.08)",
          strong: "rgba(255,255,255,0.16)",
        },
        text: {
          primary: "#f2f2f2",
          secondary: "#888888",
          muted: "#484848",
        },
        accent: {
          DEFAULT: "#F7931A",
          dim: "rgba(247, 147, 26, 0.12)",
          glow: "rgba(247, 147, 26, 0.30)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "6": "24px",
        "8": "32px",
        "12": "48px",
        "16": "64px",
        "24": "96px",
        "32": "128px",
      },
      borderRadius: {
        "sm": "4px",
        "md": "8px",
        "lg": "12px",
        "xl": "20px",
        "full": "9999px",
      },
      boxShadow: {
        "xs": "0 1px 2px rgba(0,0,0,0.05)",
        "sm": "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
        "md": "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.06)",
        "lg": "0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)",
        "xl": "0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)",
        "glow": "0 0 20px rgba(247, 147, 26, 0.25)",
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
