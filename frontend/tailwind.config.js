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
        // 溫度色彩
        temp: {
          low: '#9cc85b',
          medium: '#ecd890',
          high: '#ffbb88',
          extreme: '#cd6b80',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['"Source Serif Pro"', '"Merriweather"', 'serif'],
        // 中文思源黑體
        chinese: ['"Noto Sans TC"', '"Source Han Sans"', '"PingFang TC"', '"Microsoft JhengHei"', 'sans-serif'],
      },
      fontSize: {
        'xs': ['var(--text-xs)', { lineHeight: 'var(--leading-normal)' }],
        'sm': ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
        'base': ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        'lg': ['var(--text-lg)', { lineHeight: 'var(--leading-loose)' }],
        'xl': ['var(--text-xl)', { lineHeight: 'var(--leading-normal)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-tight)' }],
        '5xl': ['var(--text-5xl)', { lineHeight: 'var(--leading-tight)' }],
        display: ['clamp(3rem,6vw,5rem)', { lineHeight: '1.2' }],
        title01: ['clamp(1.8rem, 5vw, 3.5rem)', { lineHeight: '1.4' }],
        subtitle01: ['clamp(1rem,3vw,2rem)', { lineHeight: '1.4' }],
        subtitle02: ['clamp(0.975rem,2.5vw,1.625rem)', { lineHeight: '2' }],
        content01: ['clamp(0.9375rem,2vw,1.325rem)', { lineHeight: '1.6' }],
        caption01: ['clamp(0.9375rem, 1.5vw, 1.125rem)', { lineHeight: '1.4' }],
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
