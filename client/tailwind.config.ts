import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          50: "#fef3f0",
          100: "#fde4dc",
          200: "#fcc7b8",
          300: "#f9a089",
          400: "#f4694e",
          500: "#ec4420",
          600: "#dc3216",
          700: "#b72514",
          800: "#942218",
          900: "#78211a",
          950: "#420d09",
        },
        claw: {
          50: "#f0fdf6",
          100: "#dbfce9",
          200: "#baf7d5",
          300: "#84efb4",
          400: "#48de8a",
          500: "#1fc466",
          600: "#14a352",
          700: "#148043",
          800: "#156538",
          900: "#135330",
          950: "#042e18",
        },
        dark: {
          900: "#0a0a0f",
          800: "#111118",
          700: "#1a1a24",
          600: "#252530",
          500: "#33334a",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "monospace"],
      },
      animation: {
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(236, 68, 32, 0.2)" },
          "50%": { boxShadow: "0 0 40px rgba(236, 68, 32, 0.4)" },
        },
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;