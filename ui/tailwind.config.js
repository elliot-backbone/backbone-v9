/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Backbone brand colors
        'bb-dark': '#0a0a0a',
        'bb-darker': '#050505',
        'bb-panel': '#111111',
        'bb-card': '#161616',
        'bb-border': '#252525',
        'bb-border-light': '#333333',
        // Accent colors
        'bb-lime': '#def141',
        'bb-lime-dim': '#b8c936',
        'bb-red': '#ff4757',
        'bb-amber': '#ffa502',
        'bb-blue': '#3498db',
        'bb-green': '#2ed573',
        'bb-purple': '#a55eea',
        // Text hierarchy
        'bb-text': '#e8e8e8',
        'bb-text-secondary': '#888888',
        'bb-text-muted': '#555555',
      },
      fontFamily: {
        'display': ['Fahkwang', 'sans-serif'],
        'body': ['DM Sans', 'sans-serif'],
        'mono': ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        'fm': '0 4px 30px rgba(0, 0, 0, 0.5)',
        'fm-up': '0 -4px 30px rgba(0, 0, 0, 0.3)',
        'glow-lime': '0 0 20px rgba(222, 241, 65, 0.15)',
        'glow-red': '0 0 20px rgba(255, 71, 87, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
