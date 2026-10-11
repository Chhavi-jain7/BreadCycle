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
          50: "#eef7f1",
          100: "#d8eddf",
          200: "#b4dcc4",
          300: "#8ac5a4",
          400: "#5da985",
          500: "#368867",
          600: "#247455",
          700: "#17624a",
          800: "#0f5a43",
          900: "#084a39",
          950: "#12332b",
        },
        wheat: {
          50: "#fffaf0",
          100: "#fbf1d9",
          200: "#f5e2ae",
          300: "#f2ce76",
          400: "#e8ba50",
          500: "#dca23b",
          600: "#bd812b",
          700: "#956127",
          800: "#764b25",
          900: "#603d22",
          950: "#392411",
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
