/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5F0",
        ink: {
          DEFAULT: "#151515",
          soft: "#2A2A2A",
          muted: "#666666",
          dark: "#0F1115"
        },
        brand: {
          rust: "#D94826",
          rustDark: "#B83A1D",
          amber: "#F59E0B",
          emerald: "#10B981",
          cyan: "#06B6D4",
          violet: "#6366F1"
        },
        slate: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A"
        },
        line: "#E4DFD5"
      },
      fontFamily: {
        display: ["'Fraunces'", "'Plus Jakarta Sans'", "serif"],
        sans: ["'Inter'", "'Plus Jakarta Sans'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"]
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.06)",
        glow: "0 0 25px -5px rgba(217, 72, 38, 0.3)",
        card: "0 2px 10px rgba(0, 0, 0, 0.04), 0 10px 30px rgba(0, 0, 0, 0.02)"
      }
    }
  },
  plugins: []
};
