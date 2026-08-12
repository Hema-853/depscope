import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0B0E14",
        surface: "#12161F",
        surface2: "#171C27",
        hairline: "#232838",
        ink: "#E6E9EF",
        muted: "#8890A0",
        faint: "#5B6272",
        signal: "#4FD1C5",
        signalDim: "#2A5F5A",
        critical: "#E5595E",
        warning: "#F0A94E",
        low: "#5B8DEF",
        clean: "#4FBE72",
      },
      fontFamily: {
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        node: "3px",
      },
      backgroundImage: {
        grid: "linear-gradient(#171C27 1px, transparent 1px), linear-gradient(90deg, #171C27 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "28px 28px",
      },
    },
  },
  plugins: [],
};
export default config;
