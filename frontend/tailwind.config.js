// tailwind.config.js
const defaultTheme = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#F59E0B', // Ana sarı
          text: '#FBBF24',    // Açık sarı
          hover: '#FCD34D'    // Hover için daha açık sarı
        },
        brandOrange: { // Turuncu renk hover için
          DEFAULT: '#F97316', // orange-500
          light: '#FB923C'   // orange-400
        }
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      textShadow: {
        sm: '0 1px 2px var(--tw-shadow-color)',
        DEFAULT: '0 2px 4px var(--tw-shadow-color)',
        md: '0 2px 4px var(--tw-shadow-color)',
      },
      // <<< GÜNCELLENMİŞ/YENİ ANIMASYONLAR >>>
      keyframes: {
        'bell-shake': { // Yeni isim
          '0%, 100%': { transform: 'rotate(0)' },
          '15%': { transform: 'rotate(5deg)' },
          '30%': { transform: 'rotate(-5deg)' },
          '45%': { transform: 'rotate(4deg)' },
          '60%': { transform: 'rotate(-4deg)' },
          '75%': { transform: 'rotate(2deg)' },
          '85%': { transform: 'rotate(-2deg)' },
        },
        'search-pulse': { // Yeni animasyon
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
      },
      animation: {
        'bell-shake': 'bell-shake 0.5s cubic-bezier(.36,.07,.19,.97) both', // Daha hızlı ve farklı zamanlama
        'search-pulse': 'search-pulse 0.4s ease-in-out', // Pulse animasyonu
      }
      // <<< GÜNCELLENMİŞ/YENİ ANIMASYONLAR SONU >>>
    },
  },
  plugins: [
     function ({ matchUtilities, theme }) {
        matchUtilities(
          { 'text-shadow': (value) => ({ textShadow: value, }), },
          { values: theme('textShadow') }
        )
      },
  ],
}
