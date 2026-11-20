import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Color-blind-safe sequential Viridis/YlGnBu-inspired amber-teal-indigo risk scale (no alarm red)
        risk: {
          1: "#E0F2FE",
          2: "#7DD3FC",
          3: "#FDE68A",
          4: "#F59E0B",
          5: "#9A3412",
        },
      },
    },
  },
  plugins: [],
};

export default config;
