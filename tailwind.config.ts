import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "hsl(var(--ink))",
        arena: "hsl(var(--arena))",
        panel: "hsl(var(--panel))",
        field: "hsl(var(--field))",
        line: "hsl(var(--line))",
        muted: "hsl(var(--muted))",
        cyan: "hsl(var(--cyan))",
        magenta: "hsl(var(--magenta))",
        lime: "hsl(var(--lime))",
        gold: "hsl(var(--gold))",
        danger: "hsl(var(--danger))"
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
        glow: "var(--shadow-glow)"
      }
    }
  },
  plugins: []
};

export default config;
