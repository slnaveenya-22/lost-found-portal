/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "brand-primary": "#1E3A5F",
        "brand-primary-light": "#2E5A8C",
        "brand-accent": "#E85D75",
        "brand-accent-soft": "#FCE7EC",
        "brand-accent-tint": "#FDF5F7",   // NEW — sidebar gradient top
        "brand-gold": "#D4A853",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};