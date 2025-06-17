// tailwind.config.ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "fuchsia-pale": "#DDA0DD",
        "fuchsia-electric": "#FF3F8E",
      },
    },
  },
  plugins: [],
};
export default config;
