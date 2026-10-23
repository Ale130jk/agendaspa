/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          50: '#faf7f1',
          100: '#f4ede1',
          200: '#e8dac5',
          300: '#d7c1a0',
          400: '#c3a379',
          500: '#b08b5c',
          600: '#98714a',
          700: '#7d5a3d',
          800: '#674b36',
          900: '#563f30',
        },
        sage: {
          50: '#f3f6f0',
          100: '#e4ebde',
          200: '#cad8bf',
          300: '#a9bf98',
          400: '#87a372',
          500: '#6b8a57',
          600: '#546e43',
          700: '#435737',
          800: '#38472f',
          900: '#303d29',
        },
        clay: {
          50: '#fbf3ef',
          100: '#f6e3da',
          200: '#edc7b7',
          300: '#e0a28a',
          400: '#d17d5f',
          500: '#c26043',
          600: '#a94b34',
          700: '#8c3c2c',
          800: '#74342a',
          900: '#612e27',
        },
        ink: '#24231f',
        paper: '#fdfbf7',
      },
      fontFamily: {
        sans: ['Manrope Variable', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces Variable', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 18px 50px -28px rgba(36, 35, 31, 0.35)',
        lift: '0 24px 70px -32px rgba(36, 35, 31, 0.45)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};
