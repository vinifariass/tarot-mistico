import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#0D0A1A",
        abyss: "#1A0F2E",
        arcane: "#2D1B5E",
        mystic: "#7B2FBE",
        amethyst: "#9B59D0",
        gold: "#D4AF37",
        "gold-light": "#F0C850",
        parchment: "#F0E6FF",
        muted: "#9B8AAB",
      },
      fontFamily: {
        display: ["Cinzel", "serif"],
        body: ["Lato", "sans-serif"],
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(-2deg)" },
          "50%": { transform: "translateY(-20px) rotate(2deg)" },
        },
        "card-spin": {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(360deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(123,47,190,0.4)" },
          "50%": { boxShadow: "0 0 60px rgba(212,175,55,0.6), 0 0 100px rgba(123,47,190,0.4)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.3", transform: "scale(0.8)" },
        },
        "orbit-slow": {
          "0%": { transform: "rotate(0deg) translateX(120px) rotate(0deg)" },
          "100%": { transform: "rotate(360deg) translateX(120px) rotate(-360deg)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "card-spin": "card-spin 8s linear infinite",
        shimmer: "shimmer 3s linear infinite",
        glow: "glow 3s ease-in-out infinite",
        twinkle: "twinkle 2s ease-in-out infinite",
        "orbit-slow": "orbit-slow 20s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
