import { K } from "../../tokens";

export default function Card({ children, padding = 16, raised = false, style = {}, onClick, className }) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: raised ? K.surface2 : K.surface,
        border: `1px solid ${K.border}`,
        borderRadius: 14,
        padding,
        cursor: onClick ? "pointer" : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
