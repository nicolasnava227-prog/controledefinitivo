// Kuali design tokens — fonte de verdade do redesign visual.
// Importe via `import { K, T, FONT, MONO, RADIUS, SPACE } from "./kuali/tokens"`.
// Não altere valores aqui sem atualizar o handoff (design_handoff_kuali/README.md).

export const K = {
  // Marca
  orange:      "#FF6A00", // primary — fogo/calor/energia
  orangeDeep:  "#E55E00",
  orangeSoft:  "#FF8A33",
  black:       "#0D0D0D",
  white:       "#FFFFFF",

  // Neutros (UI dark — uso principal)
  ink:          "#141416", // bg da página
  surface:      "#1A1A1E", // cards
  surface2:     "#222226", // raised / inputs
  border:       "#2A2A30",
  borderStrong: "#3A3A42",
  muted:        "#6E6E78", // texto terciário
  text2:        "#A8A8B2", // texto secundário
  text:         "#F2F2F0", // texto primário

  // Acentos categóricos (uso reduzido)
  red:    "#C0392B",
  yellow: "#FFC300",
  green:  "#2DBA72",
  gray:   "#2C2C2C",

  // Funcional / semântico
  ok:   "#2DBA72",
  warn: "#FFC300",
  err:  "#E04A3D",
  info: "#3B9CFF",
};

export const FONT = '"Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif';
export const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

// Escala tipográfica (mobile-first)
export const T = {
  display: { fontSize: 32, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.02em" },
  h1:      { fontSize: 24, lineHeight: "28px", fontWeight: 700, letterSpacing: "-0.01em" },
  h2:      { fontSize: 19, lineHeight: "24px", fontWeight: 600, letterSpacing: "-0.005em" },
  h3:      { fontSize: 16, lineHeight: "22px", fontWeight: 600 },
  body:    { fontSize: 15, lineHeight: "22px", fontWeight: 400 },
  bodyB:   { fontSize: 15, lineHeight: "22px", fontWeight: 600 },
  small:   { fontSize: 13, lineHeight: "18px", fontWeight: 500 },
  caption: { fontSize: 11, lineHeight: "14px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" },
  mono:    { fontFamily: MONO, fontSize: 13, fontWeight: 500 },
};

export const RADIUS = { sm: 6, md: 10, lg: 12, xl: 14, pill: 9999 };
export const SPACE  = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64];
