/**
 * Tokens oficiais do tema da marca Menina Mulher Lingerie
 * Extraídos da logo e do protótipo de alta fidelidade (PBI #69 — RNF01, RNF07, RNF08).
 */
export const theme = {
  colors: {
    brand: {
      primary: "#D1025A", // Rectangle 1 — Magenta principal (botões primários, destaques, aba ativa)
      primaryHover: "#B0024B",
      plum: "#520139", // Rectangle 2 — Vinho profundo (títulos editoriais, textos de destaque)
      blush: "#F5CCD0", // Rectangle 3 — Rosa claro suave (fundos de destaque, badges, ícones)
      surface: "#FFFFFF", // Rectangle 4 — Superfície principal clara (cards, header, modais)
      muted: "#6F4F64", // Rectangle 5 — Malva acinzentado (textos secundários, subtítulos)
      background: "#FCF8F9", // Fundo geral off-white rosado suave
      surfaceSoft: "#F9F1F3", // Superfície secundária para blocos e inputs
      border: "#EFE2E6", // Bordas sutis de cartões e divisores
    },
    text: {
      primary: "#23101B", // Contraste > 12:1 sobre #FFFFFF (atende RNF07 >= 4.5:1)
      heading: "#520139", // Contraste > 9.5:1 sobre #FFFFFF (atende RNF07 >= 4.5:1)
      secondary: "#6F4F64", // Contraste > 5.4:1 sobre #FFFFFF (atende RNF07 >= 4.5:1)
    },
    status: {
      success: "#15803D",
      successBg: "#DCFCE7",
      warning: "#B45309",
      warningBg: "#FEF3C7",
      danger: "#B91C1C",
      dangerBg: "#FEE2E2",
    },
  },
  typography: {
    fontDisplay: '"Playfair Display", Georgia, serif',
    fontBody: '"Plus Jakarta Sans", system-ui, -apple-system, sans-serif',
  },
  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
    "2xl": "3rem", // 48px
  },
  radius: {
    sm: "0.5rem", // 8px
    md: "0.75rem", // 12px
    lg: "1rem", // 16px
    xl: "1.5rem", // 24px
    full: "9999px",
  },
  accessibility: {
    minTouchTargetPx: 44,
    minContrastRatio: 4.5,
    minViewportWidthPx: 360,
    desktopBreakpointPx: 1024,
  },
} as const;

export type Theme = typeof theme;
