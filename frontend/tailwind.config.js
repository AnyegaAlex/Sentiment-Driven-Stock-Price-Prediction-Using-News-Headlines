import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        // ===== Brand Colors – EXCLUSIVE =====
        black: '#000000',
        white: '#FFFFFF',
        'dust-grey': '#D3D3D3',
        gray: {
          900: '#111111',
          800: '#1F2937',
          700: '#374151',
          600: '#4B5563',
          500: '#6B7280',
          400: '#9CA3AF',
          300: '#D1D5DB',
        },
        green: {
          400: '#34D399',
          500: '#22C55E',
        },
        red: {
          400: '#F87171',
        },
        // Keep shadcn/ui required aliases but map to brand colors
        background: '#000000',
        foreground: '#FFFFFF',
        card: {
          DEFAULT: '#111111',  // gray-900
          foreground: '#FFFFFF',
        },
        popover: {
          DEFAULT: '#111111',
          foreground: '#FFFFFF',
        },
        primary: {
          DEFAULT: '#FFFFFF',  // white
          foreground: '#000000',
        },
        secondary: {
          DEFAULT: '#1F2937',  // gray-800
          foreground: '#FFFFFF',
        },
        muted: {
          DEFAULT: '#374151',  // gray-700
          foreground: '#9CA3AF', // gray-400
        },
        accent: {
          DEFAULT: '#1F2937',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: '#F87171',  // red-400
          foreground: '#FFFFFF',
        },
        border: '#1F2937',     // gray-800
        input: '#1F2937',
        ring: '#9CA3AF',       // gray-400
        // Chart colors – using our palette
        chart: {
          1: '#9CA3AF',  // gray-400
          2: '#34D399',  // green-400
          3: '#F87171',  // red-400
          4: '#D1D5DB',  // gray-300
          5: '#6B7280',  // gray-500
        },
      },
      keyframes: {
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        spin: 'spin 1s linear infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};