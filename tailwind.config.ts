import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0f1a3a',
          mid: '#1a2d5a',
        },
        sky: {
          DEFAULT: '#5ab4e0',
          light: '#7dcbf5',
        },
        orange: {
          DEFAULT: '#e87a2a',
          hover: '#f09050',
        },
        gold: '#f5c842',
        cream: '#f0ede4',
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        manrope: ['Manrope', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
