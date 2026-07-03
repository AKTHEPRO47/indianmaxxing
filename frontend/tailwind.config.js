/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        momentum: {
          up:    '#10b981',
          down:  '#ef4444',
          flat:  '#f59e0b',
        },
        surface: {
          DEFAULT: '#ffffff',
          secondary: '#f8fafc',
          border: '#e2e8f0',
        },
        text: {
          primary:   '#0f172a',
          secondary: '#475569',
          muted:     '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'Manrope', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.08)',
      },
    },
  },
  plugins: [],
}
