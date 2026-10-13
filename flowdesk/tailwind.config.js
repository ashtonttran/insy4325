/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand / primary (indigo-purple from FlowDesk mockups)
        brand: {
          50: '#eef0fe',
          100: '#dfe1fd',
          200: '#c3c6fb',
          300: '#9ea2f6',
          400: '#7a7cf0',
          500: '#5b4fe5', // primary
          600: '#4a3dd4',
          700: '#3e32b0',
          800: '#342c8e',
          900: '#2e2a72',
        },
        // Neutral surfaces & text
        canvas: '#f7f8fa', // app background
        surface: '#ffffff', // cards
        line: '#eaebef', // borders / dividers
        ink: {
          DEFAULT: '#1a1d23', // primary text
          muted: '#6b7280', // secondary text
          subtle: '#9ca3af', // metadata / placeholder
        },
        // Semantic accents (task priority, event blocks)
        accent: {
          red: '#ef4444',
          orange: '#f59e0b',
          green: '#10b981',
          purple: '#5b4fe5',
          gray: '#9ca3af',
        },
      },
      borderRadius: {
        card: '10px',
        btn: '8px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        popover: '0 8px 24px rgba(16, 24, 40, 0.12)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
