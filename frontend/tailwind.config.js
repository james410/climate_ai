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
    './src/sections/**/*.{ts,tsx}',
    './src/layout/**/*.{ts,tsx}',
    './src/ui/**/*.{ts,tsx}',
    './src/hooks/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    // 如果有使用 JS 或 JSX 檔案，也一併掃描
    './src/app/**/*.{js,jsx}',
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/**/*.{js,ts,jsx,tsx}'
  ],

  theme: {
    extend: {
      colors: {
        primary:  'rgb(138, 240, 244)',      // 天空藍
        surface:  'rgb(37, 38, 40)',         // base black
        surface2: 'rgb(246, 191, 199)',      // 石英粉，secondary panel
        glass:    'rgba(255,255,255,0.075)', // frosted overlay
        temp: {
          low:     '#EAB090',  // 0%-24%
          medium:  '#E27777',  // 25%-49%
          high:    '#AE567D',  // 50%-74%
          extreme: '#724B80',  // 75%-100%
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
      
    },
  },
  plugins: [ require('tailwindcss-animate') ],
}
