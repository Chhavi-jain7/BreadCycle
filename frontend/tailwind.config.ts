import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f0f7f4",
          100: "#d9ede4",
          200: "#b5dbc9",
          300: "#86c1a7",
          400: "#57a283",
          500: "#368666",
          600: "#266b51",
          700: "#1f5642",
          800: "#1b4332",
          900: "#164e3f",
          950: "#0c2820",
        },
        wheat: {
          50: "#fbf8f0",
          100: "#f6eedb",
          200: "#eddcb7",
          300: "#e1c48e",
          400: "#d4a962",
          500: "#c8963e",
          600: "#b47e32",
          700: "#92602a",
          800: "#774d27",
          900: "#634024",
          950: "#392211",
        },
        ivory: {
          50: "#fdfbf7",
          100: "#faf6ee",
          200: "#f4eedd",
          300: "#ebe1c6",
          400: "#dfcea7",
          500: "#cdb585",
        },
        charcoal: {
          800: "#1f2937",
          900: "#111827",
          950: "#0b0f17",
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "Cambria", "Times New Roman", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
