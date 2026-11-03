/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4FC17D',
          500: '#22A05A',
          600: '#15803D',
          700: '#166534',
          800: '#14532D',
          900: '#0F3D26',
          950: '#08251A',
        },
        lime: {
          100: '#F2F6E4',
          200: '#E6EFCB',
          300: '#D3E3A4',
          400: '#BBD27C',
          500: '#A2BD5C',
        },
        sand: {
          50: '#F8FAF8',
          100: '#F2F5F2',
          200: '#E9EDE9',
        },
        ink: {
          900: '#17231C',
          800: '#243128',
          700: '#3B4A41',
          600: '#4E5C53',
          500: '#647067',
          400: '#8A948D',
          300: '#C2CCC5',
          200: '#D9DFDA',
        },
        line: '#E5EAE6',
        warning: {
          DEFAULT: '#D97706',
          50: '#FEF7EC',
          100: '#FBECD7',
          200: '#F4D9B0',
          700: '#B45309',
        },
        danger: {
          DEFAULT: '#DC2626',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FBCFCF',
          700: '#B91C1C',
        },
        success: {
          DEFAULT: '#15803D',
          50: '#F0FDF4',
          100: '#DCFCE7',
          700: '#166534',
        },
        info: {
          DEFAULT: '#3E5D74',
          50: '#EEF3F7',
          100: '#DEE8F0',
          700: '#33505F',
        },
        water: {
          DEFAULT: '#3E7A8C',
          50: '#EEF5F7',
          100: '#DDEAEF',
          700: '#2F6270',
        },
        olive: {
          DEFAULT: '#5D7223',
          50: '#F4F8E8',
          100: '#EAF2D4',
          700: '#4C5E1C',
        },
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontWeight: {
        550: '550',
        650: '650',
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 35, 28, 0.04), 0 8px 24px -18px rgba(23, 35, 28, 0.22)',
        lift: '0 2px 4px rgba(23, 35, 28, 0.05), 0 18px 40px -24px rgba(23, 35, 28, 0.32)',
        pop: '0 12px 32px -12px rgba(23, 35, 28, 0.28)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'toast-in': 'toast-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
