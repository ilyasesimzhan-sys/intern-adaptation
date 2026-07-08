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
    },
  },
  plugins: [],
}
