import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'dp-bg': '#050c14',
        'dp-grid': '#0d2137',
        'dp-border': '#0e4166',
        'dp-accent': '#00f0ff',
        'dp-hit': '#ff003c',
        'dp-miss': '#1a3a5c',
        'dp-disabled': '#ff6a00',
        'dp-text': '#c8e6ff',
        'dp-surface': '#091929',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        flicker: 'flicker 0.15s ease-in-out 3',
        scanline: 'scanline 8s linear infinite',
      },
      keyframes: {
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 8px #00f0ff, 0 0 20px rgba(0,240,255,0.3)',
        'glow-red': '0 0 8px #ff003c, 0 0 20px rgba(255,0,60,0.3)',
        'glow-orange': '0 0 8px #ff6a00, 0 0 20px rgba(255,106,0,0.3)',
        'glow-grid': '0 0 30px rgba(0,240,255,0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
