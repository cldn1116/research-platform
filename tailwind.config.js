/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        academic: {
          50: '#f8f7f4',
          100: '#ede9e0',
          200: '#d8d0c0',
          300: '#bfb19a',
          400: '#a08f74',
          500: '#8a7560',
          600: '#6e5d4d',
          700: '#594b3f',
          800: '#4a3f36',
          900: '#3e342d',
        },
      },
      typography: {
        academic: {
          css: {
            fontSize: '11pt',
            lineHeight: '1.8',
          },
        },
      },
    },
  },
  plugins: [],
};
