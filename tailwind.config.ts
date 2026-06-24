import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold:  { DEFAULT: '#b89b5e', dark: '#8f7740', light: '#d9c79a' },
        ink:   { DEFAULT: '#1a1d23', soft: '#2a2f38' },
        brand: { DEFAULT: '#b89b5e', fg: '#fbf9f4' },
      },
      fontFamily: { sans: ['var(--font-cairo)', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 3px rgba(26,29,35,.08), 0 1px 2px rgba(26,29,35,.04)' },
    },
  },
  plugins: [],
};
export default config;
