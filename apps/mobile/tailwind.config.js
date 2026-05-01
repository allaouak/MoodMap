/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,ts,jsx,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F8F4FF",
          100: "#EDE5FF",
          200: "#D6C5FF",
          300: "#B89BFF",
          400: "#9B6EFF",
          500: "#7C3AED",
          600: "#6D28D9",
          700: "#5B21B6",
          800: "#4C1D95",
          900: "#3C1670",
        },
        mood: {
          great: "#34D399",
          good: "#60A5FA",
          neutral: "#FBBF24",
          low: "#F97316",
          bad: "#F87171",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          soft: "#F8F4FF",
          muted: "#F3F4F6",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
