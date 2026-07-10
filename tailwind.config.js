/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2f9',
          100: '#d7e1f0',
          200: '#b0c3e1',
          300: '#84a1cf',
          400: '#5b80bd',
          500: '#3d63a3',
          600: '#2d4d82',
          700: '#213a63',
          800: '#182a48',
          900: '#101d33',
          950: '#0a1424',
        },
        success: {
          50: '#eafaf1',
          500: '#1fa971',
          600: '#178a5b',
        },
        danger: {
          50: '#fdecec',
          500: '#e0413a',
          600: '#c22f29',
        },
        warning: {
          50: '#fff8e6',
          500: '#e8a916',
          600: '#c78c0d',
        },
        sky: {
          50: '#eaf7fe',
          100: '#cfeefd',
          400: '#38b6f0',
          500: '#1e9fe0',
          600: '#1580ba',
        },
        violet: {
          50: '#f2eefc',
          100: '#e1d6f9',
          400: '#9b6ee8',
          500: '#7c4fd4',
          600: '#6338b0',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        'chase-pulse': {
          '0%, 100%': { transform: 'scale(0.85)', opacity: '0' },
          '10%': { opacity: '0.55' },
          '22%': { transform: 'scale(1.55)', opacity: '0' },
        },
        'chase-sweep': {
          '0%, 100%': { transform: 'translateX(-120%)', opacity: '0' },
          '8%': { opacity: '1' },
          '22%': { transform: 'translateX(220%)', opacity: '0' },
        },
        'chase-blink': {
          '0%, 100%': { opacity: '1' },
          '10%': { opacity: '0.25' },
          '20%': { opacity: '1' },
        },
      },
      animation: {
        pop: 'pop 0.4s ease-out',
        'chase-pulse': 'chase-pulse 2.8s ease-out infinite',
        'chase-sweep': 'chase-sweep 2.8s ease-in-out infinite',
        'chase-blink': 'chase-blink 2.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
