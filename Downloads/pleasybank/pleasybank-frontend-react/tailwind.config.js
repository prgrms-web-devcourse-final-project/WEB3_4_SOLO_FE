/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4466BA",
        secondary: "#72A1E5",
        accent: "#FFDE57",
        border: "#C3D4EF",
      },
      fontFamily: {
        sans: ["Noto Sans KR", "sans-serif"],
        serif: ["Georgia", "serif"],
      },
    },
  },
  plugins: [],
}
