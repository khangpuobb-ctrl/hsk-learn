/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          light: '#2E3F61',
          DEFAULT: '#1B2A4A',
          dark: '#0F1A30',
        },
        sand: {
          light: '#FAF9F6',
          DEFAULT: '#F8F6F1',
          dark: '#EAE5D8',
        },
        gold: {
          light: '#F0D98C',
          DEFAULT: '#E8C96B',
          dark: '#CCA73D',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Noto Serif SC', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
