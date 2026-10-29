/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effafc', 100: '#d5f1f7', 200: '#abe3ee', 300: '#72cfe2', 400: '#38b4cf',
          500: '#1c97b4', 600: '#127a98', 700: '#126280', 800: '#154f66', 900: '#164257'
        }
      },
      fontFamily: { sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(15,23,42,.05), 0 1px 3px rgba(15,23,42,.04)', pop: '0 10px 30px rgba(15,23,42,.18)' }
    }
  },
  plugins: []
};
