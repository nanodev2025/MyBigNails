/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'rose-powder': '#F8E8EB',
        'nude': '#F5E9E0',
        'beige-warm': '#F2E6DA',
        'rose-gold': '#CFA18D',
        'accent': '#D89CA8'
      },
      fontFamily: {
        elegant: ['ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui']
      },
      borderRadius: {
        xl: '1rem'
      },
      boxShadow: {
        soft: '0 6px 18px rgba(0,0,0,0.08)'
      }
    },
  },
  plugins: [],
}
