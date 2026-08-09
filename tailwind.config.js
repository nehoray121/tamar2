/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Assistant', 'sans-serif'] },
      colors: {
        brand: {
          bg: '#F4F5FA',
          blue: '#1E4DB7',
          lightBlue: '#5B8FD4',
          mainBlue: '#1E4DB7',
          hover: '#EEF2FF',
          text: '#1F2937',
          gray: '#6B7280',
          border: '#E5E7EB'
        },
        priority: {
          high: '#EF4444',
          highBg: '#FEE2E2',
          highBorder: '#FCA5A5',
          medium: '#F59E0B',
          mediumBg: '#FEF3C7',
          mediumBorder: '#FCD34D',
          low: '#EC4899',
          lowBg: '#FCE7F3',
          lowBorder: '#FBCFE8'
        }
      }
    }
  },
  plugins: []
};