/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#10B981',   // Emerald Green (Health/Success)
        secondary: '#0F172A', // Slate 900 (Text)
        accent: '#D1FAE5',    // Emerald 100 (Subtle Green bg)
        urgent: '#EF4444',    // Red 500
        dark: '#F8FAFC',      // Slate 50 (Used as clean background)
        light: '#FFFFFF',     // Pure White
        glass: 'rgba(255, 255, 255, 0.7)',
        glassDark: 'rgba(0, 0, 0, 0.05)',
      }
    },
  },
  plugins: [],
}
