import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0B0E13",
          secondary: "#131720",
          tertiary: "#1A2130",
          card: "#1E2A3B",
          hover: "#243040",
        },
        accent: {
          blue: "#2962FF",
          green: "#089981",
          red: "#F23645",
          yellow: "#F7931A",
          purple: "#AA00FF",
        },
        text: {
          primary: "#D1D4DC",
          secondary: "#787B86",
          muted: "#4A4F5A",
        },
        border: {
          DEFAULT: "#2A3040",
          light: "#374151",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
