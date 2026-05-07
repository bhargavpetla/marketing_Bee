import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        brand: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        product: ["Inter", "DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SF Mono", "JetBrains Mono", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        ink: { 900: "#1A1D24", DEFAULT: "#2F343E" },
        brand: { black: "#2F343E", white: "#F3F3F3" },
        grey: { 1: "#5A6579", 2: "#9CA6BA", 3: "#BDC3D0" },
        accent: {
          DEFAULT: "#4E62ED",
          hover: "#3F51D8",
          press: "#2F3FB0",
          soft: "#E5EAFF",
          deck: "#4164FD",
        },
        currency: {
          visionary: "#B7E9D5",
          calm: "#DDD0FF",
          human: "#FFD7CC",
          secure: "#90B9FF",
          intelligent: "#E6F280",
        },
        bg: {
          DEFAULT: "#FFFFFF",
          muted: "#F3F3F3",
          sunken: "#ECEEF2",
          inverse: "#2F343E",
        },
        fg: {
          DEFAULT: "#2F343E",
          muted: "#5A6579",
          subtle: "#9CA6BA",
          disabled: "#BDC3D0",
          inverse: "#F3F3F3",
        },
        border: {
          DEFAULT: "#E4E7EC",
          strong: "#BDC3D0",
          subtle: "#F1F2F5",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        pill: "9999px",
      },
      boxShadow: {
        xs: "0 1px 2px rgba(47,52,62,0.05)",
        sm: "0 2px 6px rgba(47,52,62,0.06), 0 1px 2px rgba(47,52,62,0.04)",
        md: "0 10px 24px -8px rgba(47,52,62,0.12), 0 2px 6px rgba(47,52,62,0.06)",
        lg: "0 24px 48px -16px rgba(47,52,62,0.18), 0 4px 10px rgba(47,52,62,0.06)",
        xl: "0 40px 80px -24px rgba(47,52,62,0.22)",
        focus: "0 0 0 4px rgba(65,100,253,0.18)",
      },
      backgroundImage: {
        "gradient-brand":
          "linear-gradient(110deg, #FFD7CC 0%, #DDD0FF 28%, #90B9FF 56%, #B7E9D5 80%, #E6F280 100%)",
        "gradient-secure": "linear-gradient(135deg, #90B9FF 0%, #DDD0FF 100%)",
        "gradient-accent": "linear-gradient(135deg, #4164FD 0%, #90B9FF 100%)",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.2, 0.0, 0.0, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
