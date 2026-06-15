import type { Config } from "tailwindcss";

// Colors map to CSS variables (see app/globals.css) so light/dark + Increase
// Contrast work without recompiling. Values originate from design/tokens.json.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        success: "var(--success)",
        warning: "var(--warning)",
        destructive: "var(--destructive)",
        bg: "var(--bg)",
        "bg-elevated": "var(--bg-elevated)",
        surface: "var(--surface)",
        border: "var(--border)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
      },
      borderRadius: { sm: "6px", md: "10px", lg: "14px", xl: "18px", "2xl": "24px", pill: "999px" },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Text",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: ["SF Mono", "ui-monospace", "JetBrains Mono", "monospace"],
      },
      fontSize: {
        // Apple-inspired role scale (guideline 3.3).
        "large-title": ["34px", { lineHeight: "41px", fontWeight: "700" }],
        title: ["28px", { lineHeight: "34px", fontWeight: "700" }],
        title2: ["22px", { lineHeight: "28px", fontWeight: "600" }],
        headline: ["17px", { lineHeight: "22px", fontWeight: "600" }],
        body: ["17px", { lineHeight: "22px" }],
        callout: ["16px", { lineHeight: "21px" }],
        caption: ["13px", { lineHeight: "18px" }],
        footnote: ["12px", { lineHeight: "16px" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        base: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "80px",
        "4xl": "112px",
      },
    },
  },
  plugins: [],
};

export default config;
