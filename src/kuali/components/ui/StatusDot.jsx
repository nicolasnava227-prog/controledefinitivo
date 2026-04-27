import { K } from "../../tokens";

const KINDS = {
  ok:    K.green,
  warn:  K.yellow,
  err:   K.err,
  idle:  K.muted,
  brand: K.orange,
};

export default function StatusDot({ kind = "ok", size = 8 }) {
  const c = KINDS[kind] || K.muted;
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: c,
        boxShadow: `0 0 0 ${size * 0.4}px ${c}33`,
        flexShrink: 0,
      }}
    />
  );
}
