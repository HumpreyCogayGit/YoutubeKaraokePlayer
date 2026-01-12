/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mux: {
          beige: '#E8E3D5',
          cream: '#F5F2EA',
          orange: '#E57A3C',
          'orange-dark': '#D16A2F',
          black: '#1A1A1A',
          yellow: '#F4C430',
          gray: {
            50: '#FAFAF9',
            100: '#F5F2EA',
            200: '#E8E3D5',
            300: '#D4CFBF',
            400: '#A39F92',
            500: '#6B6760',
            600: '#4A4740',
            700: '#2D2B28',
            800: '#1A1918',
            900: '#0F0F0E',
          },
        },
      },
      backgroundImage: {
        'mux-gradient': 'linear-gradient(135deg, #E57A3C 0%, #F4C430 100%)',
        'mux-gradient-hover': 'linear-gradient(135deg, #D16A2F 0%, #E8B428 100%)',
      },
    },
  },
  plugins: [],
}
