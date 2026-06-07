import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#f5efe6",
        ink: "#1a1a1a",
        mat: "#ece4d6",
      },
      fontFamily: {
        display: ["ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
