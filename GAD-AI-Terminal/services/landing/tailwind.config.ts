import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './content/**/*.{js,ts,jsx,tsx,md,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#111111',
        muted: '#6b7280',
        surface: '#f9fafb',
        border: '#e5e7eb',
      },
    },
  },
  plugins: [],
}

export default config
