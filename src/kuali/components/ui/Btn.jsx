import { K, FONT } from "../../tokens";
import Icon from "./Icon";

const SIZES = {
  sm: { h: 32, px: 12, fs: 13, gap: 6,  iconSz: 16 },
  md: { h: 44, px: 16, fs: 14, gap: 8,  iconSz: 18 },
  lg: { h: 56, px: 22, fs: 16, gap: 10, iconSz: 20 },
  xl: { h: 64, px: 28, fs: 18, gap: 12, iconSz: 22 },
};

const KINDS = {
  primary:   { bg: K.orange,   color: K.black, border: K.orange, weight: 700 },
  secondary: { bg: K.surface2, color: K.text,  border: K.border, weight: 600 },
  ghost:     { bg: "transparent", color: K.text,  border: "transparent", weight: 600 },
  danger:    { bg: K.red,      color: K.white, border: K.red,    weight: 700 },
  success:   { bg: K.green,    color: K.black, border: K.green,  weight: 700 },
};

export default function Btn({
  children, kind = "primary", size = "md", icon, iconRight,
  full = false, disabled = false, loading = false,
  onClick, type = "button", style = {}, title,
}) {
  const s = SIZES[size];
  const k = KINDS[kind];
  return (
    <button
      type={type}
      onClick={loading || disabled ? undefined : onClick}
      disabled={disabled || loading}
      title={title}
      style={{
        height: s.h,
        padding: `0 ${s.px}px`,
        background: k.bg,
        color: k.color,
        border: `1px solid ${k.border}`,
        borderRadius: 10,
        fontFamily: FONT,
        fontSize: s.fs,
        fontWeight: k.weight,
        letterSpacing: "-0.005em",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : loading ? 0.75 : 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        width: full ? "100%" : undefined,
        transition: "transform 100ms ease, filter 100ms ease, background 120ms ease",
        whiteSpace: "nowrap",
        ...style,
      }}
      onMouseDown={e => { if (!disabled && !loading) e.currentTarget.style.transform = "scale(0.98)"; }}
      onMouseUp={e => { e.currentTarget.style.transform = ""; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
    >
      {loading ? <Icon name="spinner" size={s.iconSz} spin /> : icon ? <Icon name={icon} size={s.iconSz} /> : null}
      {children}
      {!loading && iconRight && <Icon name={iconRight} size={s.iconSz} />}
    </button>
  );
}
