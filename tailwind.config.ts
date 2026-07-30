import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ivory: '#F5F0E8',
        ink: '#1A1A1A',
        teal: '#2A9D8F',
        amber: '#E9A23B',
        muted: '#7A756D',
        line: '#E2DACE',
        card: '#FDFBF7',
      },
      borderRadius: { xl2: '16px', xl3: '20px' },
      fontFamily: { sans: ['Pretendard', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
export default config;
