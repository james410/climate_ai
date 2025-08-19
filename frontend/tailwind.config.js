/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    // App Router 下所有 TSX 檔案
    './src/app/**/*.{ts,tsx}',
    // Pages Router（若有使用）
    './src/pages/**/*.{ts,tsx}',
    // Components 底下所有組件
    './src/components/**/*.{ts,tsx}',
    // 如果有使用 JS 或 JSX 檔案，也一併掃描
    './src/app/**/*.{js,jsx}',
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
  ],
  // 強制保留這些 class（即使其它頁面沒使用）
  safelist: [
    'animate-fadeInUp',
    'animate-fadeInDelay',
    'animate-spin-slow',
    'animate-spin-reverse',
    'animate-spin-ultra-slow',
    'bg-radial-glow',
  ],
  theme: {
    extend: {
      colors: {
        primary:  'rgb(138, 240, 244)',      // 天空藍
        surface:  'rgb(37, 38, 40)',         // base black
        surface2: 'rgb(246, 191, 199)',      // 石英粉，secondary panel
        glass:    'rgba(255,255,255,0.075)', // frosted overlay
        temp: {
          low:     ' #a7d7d9',  // 冰川藍 0%-24%
          medium:  ' #c2ccc6',  // 白霧綠 25%-49%
          high:    ' #d9c5c8',  // 薄藤紫 50%-74%
          extreme: ' #f6bfc7',  // 石英粉 75%-100%
        },
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'monospace'],
        sans: ['"Space Grotesk"', 'sans-serif'],
      },
      fontSize: {
        display: ['7rem', { lineHeight: '1.2' }], // gigantic headings
      },
      dropShadow: {
        glow: '0 0 10px rgba(176,136,255,.6)',
      },
      keyframes: {
        fadeInUp: {
          '0%':   { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDelay: {
          '0%,50%': { opacity: '0' },
          '100%':   { opacity: '1' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' },
          to:   { transform: 'rotate(0deg)' },
        },
        'spin-ultra-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        fadeAndFloat: {
          '0%,100%': { opacity: '0.6', transform: 'translateY(0)' },
          '50%':     { opacity: '1',   transform: 'translateY(-20px)' },
        },
       fadeAndFloatSm: {
          '0%,100%': { opacity: '0.8', transform: 'translateY(0)' },
          '50%':     { opacity: '1',   transform: 'translateY(-10px)' },
        },
      },
      animation: {
        // 自訂淡入上浮
        fadeInUp:      'fadeInUp 1.5s ease-out',
        // 文字延遲淡入
        fadeInDelay:   'fadeInDelay 2s ease-out',
        // 慢速正向旋轉
        'spin-slow':   'spin-slow 4s linear infinite',
        // 中速反向旋轉
        'spin-reverse':'spin-reverse 6s linear infinite',
        // 極慢速正向旋轉
        'spin-ultra-slow':'spin-ultra-slow 20s linear infinite',
        // 大跳動小跳動
        fadeAndFloat: 'fadeAndFloat 1.5s ease-in-out infinite',
        fadeAndFloatSm: 'fadeAndFloatSm 1.5s ease-in-out infinite',
      },
      backgroundImage: {
        // 徑向漸層背景
        'radial-glow': 'radial-gradient(circle, rgba(255,255,255,0.2), transparent)',
      },
    },
  },
  // 暫時停用可能衝突的動畫插件
  // plugins: [ require('tailwindcss-animate') ],
}
