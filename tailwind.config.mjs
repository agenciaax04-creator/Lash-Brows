/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        blush: '#fce4ec',
        rosewood: '#b23a62',
        charcoal: '#1f2937',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['Montserrat', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        soft: '0 12px 30px -18px rgba(31, 41, 55, 0.35)',
      },
    },
  },
  plugins: [],
};
