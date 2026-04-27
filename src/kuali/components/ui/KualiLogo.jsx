import { K, FONT } from "../../tokens";

export function KualiLogo({ size = 22, color = K.text, dot = K.orange }) {
  return (
    <span
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: 800,
        letterSpacing: "-0.04em",
        color,
        display: "inline-flex",
        alignItems: "baseline",
        lineHeight: 1,
      }}
    >
      kuali<span style={{ color: dot, marginLeft: 1 }}>.</span>
    </span>
  );
}

export function KualiMark({ size = 28 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        background: K.orange,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size * 0.6,
        color: K.black,
        letterSpacing: "-0.05em",
        flexShrink: 0,
        boxShadow: `0 1px 0 rgba(255,255,255,0.2) inset, 0 4px 12px ${K.orange}40`,
      }}
    >
      k
    </div>
  );
}
