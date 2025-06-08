/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#3D6734", // Deep Moss
        secondary: "#F1F1F1", // Anti-Flash White
        background: "#F1F1F1", // Same as secondary for a uniform neumorphic surface
        textDark: "#3D6734", // Using Deep Moss for text
        textLight: "#F1F1F1", // Anti-Flash White for text on dark backgrounds
      },
      fontFamily: {
        heading: ["Merriweather", "serif"],
        body: ["Inter", "sans-serif"],
      },
      boxShadow: {
        outerRaised: "5px 5px 10px rgba(0, 0, 0, 0.2), -5px -5px 10px rgba(255, 255, 255, 0.7)", // Raised effect for neumorphism
      },
      borderRadius: {
        neumorphic: "12px", // Smooth rounded corners
      },
      minHeight: {
        screen: ["100vh", "100dvh"], // Modern fallback
      }
    },
  },
  plugins: [],
};

