/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vibrant Chess.com Brand Palette
        brand: {
          50: '#F4F9EE',
          100: '#E6F3D9',
          200: '#CEE8B5',
          300: '#B0D98A',
          400: '#94C760',
          500: '#81B64C', // Chess.com iconic green
          600: '#73A444',
          700: '#588329',
          800: '#466723',
          900: '#38531D',
          // Rich Vibrant Accent Colors
          green: '#81B64C',
          greenHover: '#73A444',
          greenDark: '#588329',
          gold: '#F59E0B',
          amber: '#F59E0B',
          blue: '#3B82F6',
          purple: '#8B5CF6',
          rose: '#EF4444',
          cyan: '#06B6D4',
        },
        board: {
          light: '#EBECD0',
          dark: '#779556',
          lightSelected: '#F5F682',
          darkSelected: '#B9CA43',
          highlight: 'rgba(245, 246, 130, 0.5)',
          check: 'rgba(239, 68, 68, 0.8)',
        },
        surface: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        'card': '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
        'card-dark': '0 4px 12px -2px rgba(0, 0, 0, 0.4)',
        'tactile': '0 4px 0 #588329',
        'tactile-blue': '0 4px 0 #1D4ED8',
        'tactile-amber': '0 4px 0 #B45309',
        'board': '0 15px 35px -5px rgba(0, 0, 0, 0.3), 0 8px 12px -6px rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: [],
}
