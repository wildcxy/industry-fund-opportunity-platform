import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#10212f",
        mist: "#edf3f4",
        pine: "#1f4d4f",
        mint: "#7ec7a2",
        ember: "#d97757",
        sand: "#f3e9d2"
      },
      boxShadow: {
        panel: "0 18px 48px rgba(16, 33, 47, 0.08)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;
