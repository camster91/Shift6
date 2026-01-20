/* eslint-env node */
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Primary brand color
                primary: {
                    DEFAULT: '#06b6d4',
                    50: '#ecfeff',
                    100: '#cffafe',
                    200: '#a5f3fc',
                    300: '#67e8f9',
                    400: '#22d3ee',
                    500: '#06b6d4',
                    600: '#0891b2',
                    700: '#0e7490',
                    800: '#155e75',
                    900: '#164e63',
                },
            },
            opacity: {
                // Standardized opacity scale
                'subtle': '0.05',
                'light': '0.10',
                'medium': '0.20',
                'strong': '0.30',
                'heavy': '0.50',
            },
            boxShadow: {
                // Neon glow effects
                'neon-sm': '0 0 10px rgba(6, 182, 212, 0.15)',
                'neon': '0 0 15px rgba(6, 182, 212, 0.25)',
                'neon-lg': '0 0 25px rgba(6, 182, 212, 0.35)',
                'neon-xl': '0 0 40px rgba(6, 182, 212, 0.45)',
            },
            animation: {
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
            },
            keyframes: {
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 10px rgba(6, 182, 212, 0.2)' },
                    '50%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.4)' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    safelist: [
        {
            pattern: /^(bg|text|border|ring|shadow)-(blue|orange|cyan|emerald|indigo|rose|purple|fuchsia|amber|yellow|teal|pink)-(50|100|200|300|400|500|600|700|800|900)(\/.*)?$/,
        }
    ],
    plugins: [
        require("tailwindcss-animate"),
    ],
}
