/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff', 100: '#dfe6ff', 200: '#c1ceff', 300: '#94a9fb', 400: '#6482f0',
          500: '#3f5fe0', 600: '#2a49c6', 700: '#223ba0', 800: '#1d317f', 900: '#172554'
        },
        ink: '#0e1726',
        heat: { 400: '#ff8a4f', 500: '#f2652a', 600: '#d9501a' },
        paper: '#eef2fb'
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-body)', 'system-ui', 'sans-serif']
      },
      boxShadow: { card: '0 1px 0 rgba(14,23,38,.04)', soft: '0 6px 20px rgba(37,56,160,.09)', pop: '0 -6px 24px rgba(14,23,38,.10)', lift: '0 12px 32px rgba(14,23,38,.22)' }
    }
  },
  plugins: []
};
