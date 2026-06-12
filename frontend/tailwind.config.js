/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        canvas: '#ffffff',
        'surface-soft': '#f8f9fa',
        'surface-card': '#f5f5f5',
        'surface-dark': '#101010',
        'surface-dark-elevated': '#1a1a1a',
        hairline: '#e5e7eb',
        'hairline-soft': '#f3f4f6',
        ink: '#111111',
        body: '#374151',
        muted: '#6b7280',
        'muted-soft': '#898989',
        'on-dark': '#ffffff',
        'on-dark-soft': '#a1a1aa',
        'badge-orange': '#fb923c',
        'badge-pink': '#ec4899',
        'badge-violet': '#8b5cf6',
        'badge-emerald': '#34d399',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
      },
    },
  },
  plugins: [],
}
