/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#FFFFFF',
        secondary: '#E5E7EB',
        urgent: '#EF4444',
        dark: '#0B0B0D',
        light: '#F8FAFC'
      }
    },
  },
  plugins: [],
}
