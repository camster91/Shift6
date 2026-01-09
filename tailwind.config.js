/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {},
    },
    safelist: [
        {
            pattern: /^(bg|text|border|ring|shadow)-(blue|orange|cyan|emerald|indigo|rose|purple|fuchsia|amber)-(50|100|200|300|400|500|600|700|800|900)(\/.*)?$/,
        }
    ],
    plugins: [
        require("tailwindcss-animate"),
    ],
}
