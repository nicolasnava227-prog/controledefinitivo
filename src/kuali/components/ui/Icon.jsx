// Wrapper sobre @phosphor-icons/react que mantém os nomes do design system Kuali.
// Mapeamento intencionalmente explícito — se um nome novo aparecer no design,
// adicione aqui. Pesos seguem o handoff: stroke 1.7 ≈ "regular" do Phosphor.
import {
  Check, Circle, CheckCircle, Camera, ListBullets, ShoppingBag, Receipt,
  Package, Clock, Note, ChartBar, SquaresFour, MagnifyingGlass, Plus,
  ArrowLeft, ArrowRight, CaretRight, CaretDown, WifiSlash, CloudCheck,
  CircleNotch, Warning, Flame, User, Funnel, UploadSimple, Sparkle,
  List as MenuIcon, X, House, Factory, PushPin, Trash, PencilSimple, Bell, SignOut,
} from "@phosphor-icons/react";

const MAP = {
  "check":          [Check, "regular"],
  "check-bold":     [Check, "bold"],
  "circle":         [Circle, "regular"],
  "check-circle":   [CheckCircle, "regular"],
  "camera":         [Camera, "regular"],
  "list":           [ListBullets, "regular"],
  "shopping":       [ShoppingBag, "regular"],
  "receipt":        [Receipt, "regular"],
  "box":            [Package, "regular"],
  "clock":          [Clock, "regular"],
  "note":           [Note, "regular"],
  "chart":          [ChartBar, "regular"],
  "grid":           [SquaresFour, "regular"],
  "search":         [MagnifyingGlass, "regular"],
  "plus":           [Plus, "regular"],
  "arrow-left":     [ArrowLeft, "regular"],
  "arrow-right":    [ArrowRight, "regular"],
  "chevron-right":  [CaretRight, "bold"],
  "chevron-down":   [CaretDown, "bold"],
  "wifi-off":       [WifiSlash, "regular"],
  "cloud-check":    [CloudCheck, "regular"],
  "spinner":        [CircleNotch, "bold"],
  "alert":          [Warning, "regular"],
  "flame":          [Flame, "regular"],
  "user":           [User, "regular"],
  "filter":         [Funnel, "regular"],
  "upload":         [UploadSimple, "regular"],
  "sparkle":        [Sparkle, "fill"],
  "menu":           [MenuIcon, "regular"],
  "x":              [X, "regular"],
  "home":           [House, "regular"],
  "production":     [Factory, "regular"],
  "pin":            [PushPin, "regular"],
  // extras úteis pro app
  "trash":          [Trash, "regular"],
  "edit":           [PencilSimple, "regular"],
  "bell":           [Bell, "regular"],
  "signout":        [SignOut, "regular"],
};

export default function Icon({ name, size = 20, color = "currentColor", weight, spin = false, style }) {
  const entry = MAP[name];
  if (!entry) return null;
  const [Cmp, defaultWeight] = entry;
  const w = weight || defaultWeight;
  return (
    <Cmp
      size={size}
      color={color}
      weight={w}
      style={spin ? { animation: "kuali-spin 1.2s linear infinite", ...style } : style}
    />
  );
}
