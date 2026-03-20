/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chimera: {
          black: '#111111',
          dark: '#1a1a1a',
          surface: '#242424',
          border: '#2e2e2e',
          gold: '#d4a136',
          'gold-light': '#e8b84b',
          'gold-dark': '#b8882a',
          'red-urgent': '#8b1a1a',
          'text-primary': '#f3f3f3',
          'text-secondary': '#c9c9c9',
          'text-muted': '#9b9b9b',
        },
      },
      fontFamily: {
        display: ['Oswald', 'Arial Narrow', 'sans-serif'],
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px -12px rgb(0 0 0 / 0.4)',
        'neon': '0 0 15px rgb(212 161 54 / 0.5), 0 0 30px rgb(212 161 54 / 0.3)',
      },
    },
  },
  plugins: [],
}
