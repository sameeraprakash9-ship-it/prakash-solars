/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: '#17233b',
        muted: '#687386',
        leaf: '#93620a',
        lime: '#f2c866',
        canvas: '#f5f3ed'
      },
      boxShadow: {
        card: '0 18px 50px rgba(23, 35, 59, 0.08)'
      }
    }
  },
  plugins: []
};
