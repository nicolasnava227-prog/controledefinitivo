import { K, FONT } from "../../tokens";
import Icon from "./Icon";

export default function Chip({ children, color = K.text2, bg = K.surface2, icon, style = {} }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 24,
        padding: "0 8px",
        borderRadius: 6,
        background: bg,
        color,
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
