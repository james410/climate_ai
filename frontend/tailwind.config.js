/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/sections/**/*.{ts,tsx}',
    './src/layout/**/*.{ts,tsx}',
    './src/ui/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './src/app/**/*.{js,jsx}',
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // 主要色彩系統
        primary: '#2f4f4f',
        secondary: '#d18b8b',
        accent: '#faebd7',
        // 表面色彩
        surface: '#5aa2a2',
        surface2: '#efadad',
        // 文字色彩
        text: {
          primary: '#ffffff',
          secondary: '#f0f4f5',
        },
        // 語義化顏色
        success: '#659e7a',
        warning: '#d6c599',
        error: '#b3858d',
        info: '#8af0f4',
        // 溫度色彩
        temp: {
          low: 'rgb(102, 189, 218)',
          medium: 'rgb(236, 190, 144)',
          high: ' #b3858d',
          extreme: 'rgb(239, 100, 158)',
        },
      },
      fontFamily: {
        mono: ['"DroidSansMono"', 'monospace'],
        sans: ['"Inter"', '"Source Sans Pro"', 'sans-serif'],
        serif: ['"Source Serif Pro"', '"Merriweather"', 'serif'],
        // 中文思源黑體
        chinese: ['"Noto Sans TC"', '"Source Han Sans"', '"PingFang TC"', '"Microsoft JhengHei"', 'sans-serif'],
      },
      fontSize: {
        display: ['7rem', { lineHeight: '1.2' }],
        title01: ['clamp(1rem, 6vw, 4rem)', { lineHeight: '1.2' }],
        subtitle01: ['clamp(0.7rem, 2vw, 1.8rem)', { lineHeight: '1.4' }],
      },
      dropShadow: {
        glow: '0 0 10px rgba(138, 240, 244, 0.6)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    function({ addComponents }) {
      addComponents({
        '.title01': {
          '@apply font-chinese text-title01 text-text-primary tracking-wider text-center': {},
        },
        '.subtitle01': {
          '@apply font-chinese text-subtitle01 text-text-secondary tracking-wide text-center font-normal max-w-2xl mx-auto mt-4': {},
        }
      });
    }
  ],
};

