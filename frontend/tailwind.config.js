/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#02050e",
          card: "rgba(8, 16, 36, 0.88)",
          cardHover: "rgba(14, 28, 60, 0.95)",
          border: "rgba(56, 189, 248, 0.3)",
          borderGlow: "rgba(0, 240, 255, 0.6)",
          cyan: "#00f0ff",
          ice: "#cffafe",
          neon: "#38bdf8",
          red: "#ff0055",
          redGlow: "#ff005599",
          gold: "#fbbf24",
          goldGlow: "#fbbf2499",
          green: "#10b981",
          emerald: "#34d399",
          dark: "#010308",
          purple: "#a855f7"
        }
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', '"JetBrains Mono"', 'Consolas', 'monospace'],
        display: ['"Orbitron"', 'system-ui', 'sans-serif'],
        tech: ['"Rajdhani"', 'sans-serif'],
        cinzel: ['"Cinzel"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'neon-cyan': '0 0 25px rgba(0, 240, 255, 0.4), inset 0 0 15px rgba(0, 240, 255, 0.15)',
        'neon-red': '0 0 25px rgba(255, 0, 85, 0.45), inset 0 0 15px rgba(255, 0, 85, 0.2)',
        'neon-gold': '0 0 30px rgba(251, 191, 36, 0.5), inset 0 0 15px rgba(251, 191, 36, 0.2)',
        'neon-green': '0 0 25px rgba(16, 185, 129, 0.45), inset 0 0 15px rgba(16, 185, 129, 0.15)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radar 6s linear infinite',
        'aurora': 'aurora 14s ease infinite alternate',
        'glitch-flicker': 'glitchFlicker 2s infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        aurora: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        glitchFlicker: {
          '0%, 100%': { opacity: 1 },
          '92%': { opacity: 1 },
          '93%': { opacity: 0.7, transform: 'translateX(2px)' },
          '94%': { opacity: 1, transform: 'translateX(0)' },
          '96%': { opacity: 0.8, transform: 'translateX(-2px)' },
          '97%': { opacity: 1, transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
}
