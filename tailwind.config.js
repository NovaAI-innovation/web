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
          black: '#0a0a0a',
          dark: '#111111',
          surface: '#1a1a1a',
          elevated: '#242424',
          border: '#2e2e2e',
          'border-subtle': '#222222',
          gold: '#d4a136',
          'gold-light': '#e8b84b',
          'gold-dark': '#b8882a',
          'gold-subtle': '#9a7224',
          'red-urgent': '#8b1a1a',
          'text-primary': '#f3f3f3',
          'text-secondary': '#c9c9c9',
          'text-muted': '#9b9b9b',
          'text-ghost': '#5a5a5a',
        },
      },
      fontFamily: {
        display: ['Oswald', 'Arial Narrow', 'sans-serif'],
        sans: ['Roboto', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px -12px rgb(0 0 0 / 0.4)',
        'glass-elevated': '0 20px 40px -20px rgba(212, 161, 54, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
        'neon': '0 0 15px rgba(212, 161, 54, 0.5), 0 0 30px rgba(212, 161, 54, 0.3)',
        'neon-sm': '0 0 10px rgba(212, 161, 54, 0.4)',
        'neon-lg': '0 0 20px rgba(212, 161, 54, 0.5), 0 0 40px rgba(212, 161, 54, 0.2), inset 0 0 20px rgba(212, 161, 54, 0.1)',
        'card-hover': '0 14px 28px -16px rgb(0 0 0 / 0.55)',
        'btn-primary': '0 10px 26px -12px rgba(212, 161, 54, 0.6)',
      },
      borderRadius: {
        'card': '0.875rem',
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0, 0, 0.2, 1) both',
        'fade-in': 'fade-in 0.5s cubic-bezier(0, 0, 0.2, 1) both',
        'scale-in': 'scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-right': 'slide-in-right 0.5s cubic-bezier(0, 0, 0.2, 1) both',
        'slide-left': 'slide-in-left 0.5s cubic-bezier(0, 0, 0.2, 1) both',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'border-glow': 'border-glow 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(212, 161, 54, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(212, 161, 54, 0.6)' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'border-glow': {
          '0%, 100%': { borderColor: 'rgba(212, 161, 54, 0.3)' },
          '50%': { borderColor: 'rgba(212, 161, 54, 0.6)' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
