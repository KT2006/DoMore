/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          DEFAULT: '#0A0A0A',
          dark: '#050505',
          light: '#141414',
        },
        indigo: {
          dark: '#141414',
          darker: '#0F0F0F',
          light: '#1A1A1A',
        },
        border: {
          light: 'rgba(255,255,255,0.15)',
          DEFAULT: 'rgba(255,255,255,0.2)',
          muted: 'rgba(255,255,255,0.1)',
        },
        accent: {
          red: '#DC2626',
          green: '#22C55E',
          blue: '#3B82F6',
          yellow: '#EAB308',
          orange: '#F97316',
        },
        mint: {
          DEFAULT: '#22C55E',
          light: '#4ADE80',
          dark: '#16A34A',
        },
        cyan: {
          soft: '#3B82F6',
          light: '#60A5FA',
          dark: '#2563EB',
        },
        amber: {
          warm: '#F97316',
          light: '#FB923C',
          dark: '#EA580C',
        },
        coral: {
          soft: '#DC2626',
          light: '#EF4444',
        },
        purple: {
          400: '#A78BFA',
          500: '#8B5CF6',
        },
        pink: {
          accent: '#EC4899',
        },
        text: {
          primary: '#FFFFFF',
          muted: '#9CA3AF',
          secondary: '#D1D5DB',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'ring-pulse': 'ring-pulse 1s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 255, 255, 0.2)' },
          '100%': { boxShadow: '0 0 15px rgba(255, 255, 255, 0.3)' },
        },
        'ring-pulse': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
      },
    },
  },
  plugins: [],
}
