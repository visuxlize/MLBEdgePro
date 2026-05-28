/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        edge: {
          bg: "#0A0E14",
          card: "#0E1219",
          border: "#1E2430",
          accent: "#FF7828",
          "amber-glow": "#FFA550",
          "amber-deep": "#C85014",
          green: "#50C882",
          red: "#EB505A",
          orange: "#FF7828",
        },
      },
    },
  },
  plugins: [],
};
