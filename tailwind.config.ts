import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      colors: {
        bg: {
          DEFAULT: '#0D0D0B',
          soft: '#141412',
          muted: '#1A1A17',
        },
        border: {
          DEFAULT: '#2A2A27',
        },
        sand: {
          DEFAULT: '#C8B89A',
          muted: '#A8956E',
          light: '#E8DCC8',
        },
        text: {
          main: '#F0EDE8',
          muted: '#A8A49E',
          dim: '#6E6A65',
        },
        accent: {
          green: '#4A7C59',
          red: '#8B3A3A',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
