import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { K, T, FONT, MONO } from "./kuali/tokens";
import { Btn, Card, Chip, StatusDot, Icon, KualiLogo, KualiMark } from "./kuali/components/ui";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORIES = [
  "Carnes & Proteínas", "Hortifruti", "Laticínios", "Bebidas",
  "Grãos & Cereais", "Temperos & Condimentos", "Óleos & Gorduras",
  "Descartáveis", "Limpeza & Higiene", "Panificação", "Congelados", "Outros",
];
// Paleta de categorias remapeada para os 4 acentos do design system Kuali
// (verde/vermelho/amarelo/laranja/info) — substitui as 12 cores aleatórias antigas.
const CAT_COLOR = {
  "Carnes & Proteínas":     K.red,
  Hortifruti:               K.green,
  Laticínios:               K.yellow,
  Bebidas:                  K.info,
  "Grãos & Cereais":        K.orange,
  "Temperos & Condimentos": K.red,
  "Óleos & Gorduras":       K.yellow,
  Descartáveis:             K.text2,
  "Limpeza & Higiene":      K.orange,
  Panificação:              K.orange,
  Congelados:               K.info,
  Outros:                   K.muted,
};
// Ícones Phosphor (em vez de emoji) — chave usada com <Icon name={CAT_ICON[c]} />
const CAT_ICON = {
  "Carnes & Proteínas":     "flame",
  Hortifruti:               "check-circle",
  Laticínios:               "box",
  Bebidas:                  "shopping",
  "Grãos & Cereais":        "box",
  "Temperos & Condimentos": "flame",
  "Óleos & Gorduras":       "box",
  Descartáveis:             "box",
  "Limpeza & Higiene":      "sparkle",
  Panificação:              "production",
  Congelados:               "box",
  Outros:                   "note",
};
const PERIODS = [
  { key: "today", label: "Hoje" }, { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mês" }, { key: "quarter", label: "Últimos 3 meses" },
  { key: "all", label: "Tudo" }, { key: "custom", label: "Personalizado" },
];
const ROLES = ["Cozinheiro(a)", "Auxiliar de cozinha", "Garçom", "Atendente", "Caixa", "Gerente", "Limpeza", "Entregador", "Outro"];
const CL_CATS = ["Abertura", "Fechamento", "Limpeza", "Segurança alimentar", "Estoque", "Atendimento", "Outro"];
// Cores e ícones das categorias de checklist alinhadas ao design system
const CL_CAT_COLORS = {
  Abertura:               K.orange,
  Fechamento:             K.red,
  Limpeza:                K.info,
  "Segurança alimentar":  K.err,
  Estoque:                K.green,
  Atendimento:            K.yellow,
  Outro:                  K.muted,
};
const CL_CAT_ICONS = {
  Abertura:               "flame",
  Fechamento:             "clock",
  Limpeza:                "check-circle",
  "Segurança alimentar":  "alert",
  Estoque:                "box",
  Atendimento:            "user",
  Outro:                  "note",
};

const DEFAULT_ADMIN = { id: "admin", name: "Administrador", username: "admin", password: "admin", role: "Gerente", isAdmin: true };

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// Ciclo de produção: abre todo dia às 21h e fecha quando o operador clica "Concluir".
// Antes das 21h, ainda estamos no ciclo que começou às 21h do dia anterior.
const PRODUCTION_CYCLE_HOUR = 21;
function getCurrentCycleKey(now = new Date()) {
  const d = new Date(now);
  if (now.getHours() < PRODUCTION_CYCLE_HOUR) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function getNextCycleStart(now = new Date()) {
  const d = new Date(now);
  d.setHours(PRODUCTION_CYCLE_HOUR, 0, 0, 0);
  if (now.getHours() >= PRODUCTION_CYCLE_HOUR) d.setDate(d.getDate() + 1);
  return d;
}
function formatBRL(v) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v); }
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function nowTime() { const d = new Date(); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }

function toISO(str) {
  if (!str) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const p = str.match(/(\d{1,2})\D(\d{1,2})\D(\d{2,4})/);
  if (p) { const y = p[3].length === 2 ? "20" + p[3] : p[3]; return `${y}-${p[2].padStart(2, "0")}-${p[1].padStart(2, "0")}`; }
  return null;
}
function formatDateBR(iso) { if (!iso) return "—"; const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; }

function isInPeriod(isoDate, period, customFrom, customTo) {
  if (period === "all" || !isoDate) return true;
  const now = new Date(); const y = now.getFullYear(), m = now.getMonth(), day = now.getDate();
  const todayStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  if (period === "today") return isoDate === todayStr;
  if (period === "week") { const dow = now.getDay(); const diff = dow === 0 ? 6 : dow - 1; const mon = new Date(y, m, day - diff); const ms = `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, "0")}-${String(mon.getDate()).padStart(2, "0")}`; return isoDate >= ms && isoDate <= todayStr; }
  if (period === "month") return isoDate.slice(0, 7) === `${y}-${String(m + 1).padStart(2, "0")}`;
  if (period === "quarter") { const q = new Date(y, m - 3, day); const qs = `${q.getFullYear()}-${String(q.getMonth() + 1).padStart(2, "0")}-${String(q.getDate()).padStart(2, "0")}`; return isoDate >= qs; }
  if (period === "custom") { if (customFrom && isoDate < customFrom) return false; if (customTo && isoDate > customTo) return false; return true; }
  return true;
}

function downloadCSV(items) {
  const header = "Data,Produto,Nome Original,Quantidade,Unidade,Valor Total,Categoria,Fornecedor\n";
  const rows = items.map(i => `${formatDateBR(i.isoDate)},${i.product},${i.originalName || ""},${i.quantity || ""},${i.unit || ""},${i.totalPrice},${i.category},${i.supplier || ""}`).join("\n");
  const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `controle_kuali_${todayISO()}.csv`; a.click();
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const inputBase = { background: "#08080c", border: "1px solid #2a2a3a", borderRadius: 6, padding: "7px 10px", color: "#ddd", fontFamily: "inherit", fontSize: 13 };
const pill = (active, color) => ({ padding: "6px 14px", borderRadius: 20, border: "1px solid", borderColor: active ? color : "#1e1e2e", background: active ? color + "14" : "transparent", color: active ? color : "#555", cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 500, transition: "all 0.2s", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 });
const actionBtn = (color) => ({ padding: "7px 16px", borderRadius: 8, border: `1px solid ${color}44`, background: color + "10", color, cursor: "pointer", fontSize: 12, fontFamily: "inherit", fontWeight: 500 });
const cardStyle = { background: "#0c0c14", borderRadius: 12, padding: "18px 20px", border: "1px solid #13131e" };

// ═══ LIGHTBOX (fullscreen photo viewer) ═════════════════════════════════════
function Lightbox({ src, onClose }) {
  if (!src) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: 20 }}>
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "#fff", fontSize: 28, cursor: "pointer", opacity: 0.7 }}>✕</button>
      <img src={src} onClick={e => e.stopPropagation()} style={{ maxWidth: "95vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, cursor: "default" }} />
    </div>
  );
}

function RestrictedArea() {
  return (
    <div className="kuali-anim" style={{ padding: "60px 16px", maxWidth: 480, margin: "0 auto", fontFamily: FONT }}>
      <Card padding={36} style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: K.surface2, color: K.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
          <Icon name="alert" size={28} />
        </div>
        <div style={{ ...T.bodyB, color: K.text }}>Área restrita</div>
        <div style={{ ...T.small, color: K.muted, marginTop: 6 }}>Disponível apenas para administradores.</div>
      </Card>
    </div>
  );
}

function RemindersModal({ reminders, currentUser, onAdd, onRemove, onClose }) {
  const [text, setText] = useState("");
  const submit = () => { if (!text.trim()) return; onAdd(text); setText(""); };
  const fmtTime = ts => { const d = new Date(ts); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: FONT }} className="kuali-anim">
      <div onClick={e => e.stopPropagation()} style={{ background: K.surface, borderRadius: 16, border: `1px solid ${K.border}`, padding: 22, width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${K.orange}1A`, color: K.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="bell" size={20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...T.h3, color: K.text }}>Lembretes</div>
              <div style={{ ...T.caption, color: K.muted, marginTop: 2 }}>{reminders.length} {reminders.length === 1 ? "AVISO ATIVO" : "AVISOS ATIVOS"}</div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar"
            style={{ width: 36, height: 36, borderRadius: 10, background: K.surface2, border: `1px solid ${K.border}`, color: K.text2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Ex: Fazer frango amanhã cedo…"
            onKeyDown={e => e.key === "Enter" && submit()}
            onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
            onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
            style={{ flex: 1, background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 10, padding: "10px 12px", color: K.text, fontFamily: FONT, fontSize: 14, outline: "none", transition: "border-color 120ms ease", minWidth: 0 }} />
          <Btn kind="primary" size="md" icon="plus" onClick={submit}>Adicionar</Btn>
        </div>

        <div style={{ overflowY: "auto", flex: 1, marginRight: -6, paddingRight: 6 }}>
          {reminders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 10px", color: K.muted, ...T.small }}>Nenhum lembrete ativo.</div>
          ) : reminders.map(r => {
            const mine = r.authorId === currentUser.id;
            return (
              <div key={r.id} style={{ padding: "12px 14px", background: K.surface2, borderRadius: 10, border: `1px solid ${K.border}`, marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Icon name="pin" size={14} color={K.orange} style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...T.body, fontSize: 14, color: K.text, wordBreak: "break-word", marginBottom: 4 }}>{r.text}</div>
                  <div style={{ ...T.small, fontSize: 11, color: K.muted }}>{r.authorName}{mine ? " (você)" : ""} · {fmtTime(r.timestamp)}</div>
                </div>
                <button onClick={() => onRemove(r.id)} title="Remover"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: K.muted, padding: 4, display: "flex" }}
                  onMouseEnter={e => e.currentTarget.style.color = K.err}
                  onMouseLeave={e => e.currentTarget.style.color = K.muted}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2A2A30; border-radius: 3px; }
  /* Horizontal scroll de tabs sem barra visível */
  div[style*="overflowX"]::-webkit-scrollbar, div[style*="overflow-x"]::-webkit-scrollbar { display: none; }
  @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { to { transform:rotate(360deg); } }
  .anim { animation: slideUp 0.3s ease-out forwards; }
  input:focus, select:focus, textarea:focus { outline: none; }
`;

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    const u = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", u); window.addEventListener("offline", u);
    return () => { window.removeEventListener("online", u); window.removeEventListener("offline", u); };
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Preencha usuário e senha");
      return;
    }
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (!r.ok) {
        setError(r.status === 401 ? "Usuário ou senha incorretos" : `Erro do servidor (${r.status})`);
        setLoading(false);
        return;
      }
      const user = await r.json();
      onLogin(user);
    } catch {
      // Fallback offline: admin/admin sempre entra
      if (username === "admin" && password === "admin") { onLogin(DEFAULT_ADMIN); }
      else { setError("Sem conexão com o servidor"); }
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    background: K.surface2,
    border: `1px solid ${K.border}`,
    borderRadius: 10,
    padding: "13px 14px",
    color: K.text,
    fontFamily: FONT,
    fontSize: 15,
    outline: "none",
    transition: "border-color 120ms ease",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: K.ink,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: FONT,
      padding: 20,
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{CSS}</style>
      {/* Glow ambiente laranja no fundo */}
      <div style={{
        position: "absolute",
        top: "-20%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 600,
        height: 600,
        background: `radial-gradient(circle, ${K.orange}1A 0%, transparent 60%)`,
        pointerEvents: "none",
      }} />

      <div className="kuali-anim" style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        {/* Marca topo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <KualiMark size={56} />
          <div style={{ marginTop: 16 }}>
            <KualiLogo size={28} />
          </div>
          <div style={{ ...T.caption, color: K.muted, marginTop: 12 }}>SISTEMA DE GESTÃO OPERACIONAL</div>
        </div>

        {/* Card */}
        <div style={{
          background: K.surface,
          border: `1px solid ${K.border}`,
          borderRadius: 16,
          padding: 28,
          boxShadow: `0 12px 40px rgba(0,0,0,0.4)`,
        }}>
          <div style={{ ...T.h2, color: K.text, marginBottom: 4 }}>Bem-vindo de volta</div>
          <div style={{ ...T.small, color: K.text2, marginBottom: 22 }}>Faça login para continuar.</div>

          {/* Status online/offline */}
          {!isOnline && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 12px", marginBottom: 16,
              background: `${K.yellow}1A`, border: `1px solid ${K.yellow}55`,
              borderRadius: 10, color: K.yellow,
              ...T.small, fontWeight: 600,
            }}>
              <Icon name="wifi-off" size={16} />
              Sem conexão — só admin/admin funciona offline
            </div>
          )}

          {/* Usuário */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 8 }}>Usuário</label>
            <div style={{ position: "relative" }}>
              <Icon name="user" size={18} color={K.muted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="seu usuário"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
                onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
                style={{ ...inputStyle, paddingLeft: 42 }}
              />
            </div>
          </div>

          {/* Senha */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 8 }}>Senha</label>
            <div style={{ position: "relative" }}>
              <Icon name="alert" size={18} color={K.muted} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", visibility: "hidden" }} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="sua senha"
                onKeyDown={e => e.key === "Enter" && handleLogin()}
                onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
                onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
                style={{ ...inputStyle, paddingLeft: 14, paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  width: 32, height: 32, borderRadius: 8,
                  background: "transparent", border: "none", cursor: "pointer",
                  color: K.muted, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                <Icon name={showPassword ? "x" : "check-circle"} size={16} />
              </button>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 12px", marginBottom: 14,
              background: `${K.err}1A`, border: `1px solid ${K.err}55`,
              borderRadius: 10, color: K.err,
              ...T.small, fontWeight: 600,
            }}>
              <Icon name="alert" size={16} /> {error}
            </div>
          )}

          {/* CTA */}
          <Btn kind="primary" size="lg" full loading={loading} onClick={handleLogin} icon={loading ? undefined : "arrow-right"} style={{ marginTop: 4 }}>
            {loading ? "Entrando…" : "Entrar"}
          </Btn>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <div style={{ ...T.small, color: K.muted, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <StatusDot kind={isOnline ? "ok" : "warn"} size={6} />
            {isOnline ? "Servidor conectado" : "Modo offline"}
          </div>
          <div style={{ ...T.small, color: K.borderStrong, marginTop: 6 }}>
            Acesso padrão: <span style={{ ...T.mono, color: K.text2 }}>admin / admin</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN: EMPLOYEE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
function EmployeeManager({ users, onAdd, onUpdate, onRemove }) {
  const empty = { name: "", username: "", password: "", role: ROLES[0], isAdmin: false };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const save = () => {
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) return;
    if (editId) {
      onUpdate(editId, form);
      setEditId(null);
    } else {
      if (users.some(u => u.username === form.username)) return alert("Usuário já existe!");
      onAdd({ ...form, id: uid() });
    }
    setForm(empty);
  };

  const startEdit = (u) => { setEditId(u.id); setForm({ name: u.name, username: u.username, password: u.password, role: u.role, isAdmin: u.isAdmin }); };
  const cancelEdit = () => { setEditId(null); setForm(empty); };
  const remove = (id) => { if (id === "admin") return alert("Não pode remover o admin principal"); onRemove(id); };

  const inputStyle = {
    width: "100%", background: K.surface2, border: `1px solid ${K.border}`,
    borderRadius: 10, padding: "10px 12px", color: K.text,
    fontFamily: FONT, fontSize: 14, outline: "none",
  };

  return (
    <div className="kuali-anim" style={{ padding: "20px 16px 32px", maxWidth: 880, margin: "0 auto", fontFamily: FONT }}>
      <Card padding={18} style={{ marginBottom: 18 }}>
        <div style={{ ...T.caption, color: K.muted, marginBottom: 14 }}>
          {editId ? "EDITAR FUNCIONÁRIO" : "ADICIONAR FUNCIONÁRIO"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Nome completo</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Maria Silva"
              onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
              onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
              style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Usuário (login)</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="maria"
                autoCapitalize="none" autoCorrect="off" spellCheck={false}
                onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
                onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
                style={inputStyle} />
            </div>
            <div>
              <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Senha</label>
              <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="1234"
                onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
                onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
                style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Função</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inputStyle}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 14, padding: "8px 12px", background: form.isAdmin ? `${K.orange}1A` : K.surface2, border: `1px solid ${form.isAdmin ? `${K.orange}55` : K.border}`, borderRadius: 10, transition: "all 150ms ease" }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: form.isAdmin ? K.orange : "transparent", border: `2px solid ${form.isAdmin ? K.orange : K.borderStrong}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {form.isAdmin && <Icon name="check-bold" size={12} color={K.black} />}
          </div>
          <input type="checkbox" checked={form.isAdmin} onChange={e => setForm({ ...form, isAdmin: e.target.checked })} style={{ display: "none" }} />
          <span style={{ ...T.bodyB, color: form.isAdmin ? K.orange : K.text2, fontSize: 13 }}>Acesso admin</span>
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn kind="primary" icon={editId ? "check" : "plus"} onClick={save}>{editId ? "Salvar alterações" : "Adicionar funcionário"}</Btn>
          {editId && <Btn kind="secondary" icon="x" onClick={cancelEdit}>Cancelar</Btn>}
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {users.map(u => (
          <div key={u.id} style={{ background: K.surface, border: `1px solid ${K.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: u.isAdmin ? `${K.orange}22` : K.surface2,
              color: u.isAdmin ? K.orange : K.text2,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: FONT, fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em",
              flexShrink: 0,
            }}>
              {u.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ ...T.bodyB, color: K.text }}>{u.name}</span>
                {u.isAdmin && <Chip color={K.orange} bg={`${K.orange}1A`}>admin</Chip>}
              </div>
              <div style={{ ...T.small, color: K.muted, marginTop: 2 }}>
                <span style={{ ...T.mono }}>@{u.username}</span> · {u.role}
              </div>
            </div>
            <button onClick={() => startEdit(u)} title="Editar"
              style={{ background: "transparent", border: "none", cursor: "pointer", color: K.muted, padding: 6, display: "flex" }}
              onMouseEnter={e => e.currentTarget.style.color = K.text}
              onMouseLeave={e => e.currentTarget.style.color = K.muted}>
              <Icon name="edit" size={16} />
            </button>
            {u.id !== "admin" && (
              <button onClick={() => remove(u.id)} title="Remover"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: K.muted, padding: 6, display: "flex" }}
                onMouseEnter={e => e.currentTarget.style.color = K.err}
                onMouseLeave={e => e.currentTarget.style.color = K.muted}>
                <Icon name="trash" size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG VIEW (reused from before)
// ═══════════════════════════════════════════════════════════════════════════

function CatalogView({ catalog, onAdd, onUpdate, onRemove }) {
  const [form, setForm] = useState({ name: "", category: CATEGORIES[0] });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");

  const addOrUpdate = () => {
    const name = form.name.trim(); if (!name) return;
    if (editId) { onUpdate(editId, { name, category: form.category }); setEditId(null); }
    else onAdd({ id: uid(), name, category: form.category });
    setForm({ name: "", category: CATEGORIES[0] });
  };

  const filtered = catalog.filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()));
  const grouped = CATEGORIES.reduce((acc, cat) => { const items = filtered.filter(p => p.category === cat); if (items.length) acc.push({ cat, items }); return acc; }, []);

  const inputStyle = {
    width: "100%", background: K.surface2, border: `1px solid ${K.border}`,
    borderRadius: 10, padding: "10px 12px", color: K.text,
    fontFamily: FONT, fontSize: 14, outline: "none",
  };

  return (
    <div className="kuali-anim" style={{ padding: "20px 16px 32px", maxWidth: 880, margin: "0 auto", fontFamily: FONT }}>
      {/* Educational callout */}
      <Card padding={16} style={{ marginBottom: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: K.orange }} />
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `${K.orange}1A`, color: K.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="sparkle" size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...T.bodyB, color: K.text, marginBottom: 4 }}>Como funciona a padronização?</div>
            <p style={{ ...T.small, color: K.text2, lineHeight: 1.6 }}>
              Cadastre o nome padrão (ex: <span style={{ color: K.text, fontWeight: 600 }}>"Frango"</span>). A IA reconhece variações como <span style={{ color: K.muted, fontStyle: "italic" }}>"FGO INTEIRO"</span> e <span style={{ color: K.muted, fontStyle: "italic" }}>"FRANGO CONG"</span> e registra como <span style={{ color: K.orange, fontWeight: 600 }}>"Frango"</span>.
            </p>
          </div>
        </div>
      </Card>

      {/* Add / edit form */}
      <Card padding={18} style={{ marginBottom: 16 }}>
        <div style={{ ...T.caption, color: K.muted, marginBottom: 14 }}>
          {editId ? "EDITAR PRODUTO" : "ADICIONAR PRODUTO"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Nome padrão do produto</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Frango, Arroz…"
              onKeyDown={e => e.key === "Enter" && addOrUpdate()}
              onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
              onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
              style={inputStyle} />
          </div>
          <div>
            <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Categoria</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn kind="primary" icon={editId ? "check" : "plus"} onClick={addOrUpdate}>{editId ? "Salvar alterações" : "Adicionar"}</Btn>
          {editId && <Btn kind="secondary" icon="x" onClick={() => { setEditId(null); setForm({ name: "", category: CATEGORIES[0] }); }}>Cancelar</Btn>}
        </div>
      </Card>

      {catalog.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: K.surface2, padding: "10px 12px", borderRadius: 10, border: `1px solid ${K.border}`, marginBottom: 16 }}>
          <Icon name="search" size={16} color={K.muted} />
          <input placeholder="Buscar no catálogo…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: K.text, fontFamily: FONT, fontSize: 14 }} />
        </div>
      )}

      {catalog.length === 0 && (
        <Card padding={32} style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: K.surface2, color: K.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Icon name="grid" size={22} />
          </div>
          <div style={{ ...T.bodyB, color: K.text }}>Nenhum produto cadastrado</div>
          <div style={{ ...T.small, color: K.muted, marginTop: 4 }}>Adicione produtos pra a IA reconhecer nas notas fiscais</div>
        </Card>
      )}

      {grouped.map(({ cat, items }) => {
        const color = CAT_COLOR[cat] || K.muted;
        return (
          <div key={cat} style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Icon name={CAT_ICON[cat]} size={14} color={color} />
              <span style={{ ...T.caption, color, letterSpacing: "0.08em" }}>{cat}</span>
              <span style={{ ...T.caption, color: K.muted }}>· {items.length}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {items.map(p => (
                <div key={p.id} style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", background: K.surface, borderRadius: 10,
                  border: `1px solid ${K.border}`,
                }}>
                  <span style={{ ...T.body, fontSize: 14, color: K.text, fontWeight: 500 }}>{p.name}</span>
                  <button onClick={() => { setEditId(p.id); setForm({ name: p.name, category: p.category }); }}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: K.muted, padding: 2, display: "flex" }}
                    onMouseEnter={e => e.currentTarget.style.color = K.text}
                    onMouseLeave={e => e.currentTarget.style.color = K.muted}>
                    <Icon name="edit" size={14} />
                  </button>
                  <button onClick={() => onRemove(p.id)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: K.muted, padding: 2, display: "flex" }}
                    onMouseEnter={e => e.currentTarget.style.color = K.err}
                    onMouseLeave={e => e.currentTarget.style.color = K.muted}>
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKLIST: CREATE
// ═══════════════════════════════════════════════════════════════════════════

function ChecklistCreate({ templates, onAdd, onUpdate, onRemove }) {
  const empty = { title: "", category: CL_CATS[0], items: [{ text: "", requiresPhoto: false }] };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { text: "", requiresPhoto: false }] }));
  const removeItem = i => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, key, val) => setForm(f => ({ ...f, items: f.items.map((it, idx) => idx === i ? { ...it, [key]: val } : it) }));

  const save = () => {
    if (!form.title.trim() || form.items.every(i => !i.text.trim())) return;
    const cleaned = { ...form, items: form.items.filter(i => i.text.trim()) };
    if (editId) {
      onUpdate(editId, cleaned);
      setEditId(null);
    } else {
      onAdd({ ...cleaned, id: uid(), createdAt: todayISO() });
    }
    setForm(empty);
  };

  const startEdit = t => { setEditId(t.id); setForm({ title: t.title, category: t.category, items: [...t.items] }); };
  const remove = id => onRemove(id);
  const moveItem = (i, dir) => setForm(f => {
    const arr = [...f.items]; const j = i + dir;
    if (j < 0 || j >= arr.length) return f;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return { ...f, items: arr };
  });

  const inputStyle = {
    width: "100%", background: K.surface2, border: `1px solid ${K.border}`,
    borderRadius: 10, padding: "10px 12px", color: K.text,
    fontFamily: FONT, fontSize: 14, outline: "none",
  };

  return (
    <div className="kuali-anim" style={{ padding: "20px 16px 32px", maxWidth: 880, margin: "0 auto", fontFamily: FONT }}>
      <Card padding={18} style={{ marginBottom: 20 }}>
        <div style={{ ...T.caption, color: K.muted, marginBottom: 14 }}>
          {editId ? "EDITAR CHECKLIST" : "CRIAR NOVO CHECKLIST"}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Nome do checklist</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Abertura do restaurante"
              onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
              onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
              style={inputStyle} />
          </div>
          <div>
            <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Categoria</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={inputStyle}>
              {CL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ ...T.caption, color: K.text2, marginBottom: 10 }}>Itens do checklist</div>
        {form.items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, flexShrink: 0 }}>
              <button onClick={() => moveItem(i, -1)} disabled={i === 0} aria-label="Subir"
                style={{ background: "transparent", border: "none", cursor: i === 0 ? "default" : "pointer", color: K.muted, opacity: i === 0 ? 0.2 : 1, padding: 2, display: "flex" }}>
                <Icon name="chevron-down" size={12} style={{ transform: "rotate(180deg)" }} />
              </button>
              <button onClick={() => moveItem(i, 1)} disabled={i === form.items.length - 1} aria-label="Descer"
                style={{ background: "transparent", border: "none", cursor: i === form.items.length - 1 ? "default" : "pointer", color: K.muted, opacity: i === form.items.length - 1 ? 0.2 : 1, padding: 2, display: "flex" }}>
                <Icon name="chevron-down" size={12} />
              </button>
            </div>
            <span style={{ ...T.mono, color: K.muted, minWidth: 24, fontSize: 13 }}>{i + 1}.</span>
            <input value={item.text} onChange={e => updateItem(i, "text", e.target.value)} placeholder="Descreva a tarefa…"
              onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
              onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
              style={{ ...inputStyle, flex: 1, minWidth: 160 }} />
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
              padding: "6px 10px", borderRadius: 8,
              background: item.requiresPhoto ? `${K.orange}1A` : "transparent",
              border: `1px solid ${item.requiresPhoto ? `${K.orange}55` : K.border}`,
              color: item.requiresPhoto ? K.orange : K.text2,
              ...T.small, fontWeight: 600, whiteSpace: "nowrap",
              transition: "all 150ms ease",
            }}>
              <input type="checkbox" checked={item.requiresPhoto} onChange={e => updateItem(i, "requiresPhoto", e.target.checked)} style={{ display: "none" }} />
              <Icon name="camera" size={14} /> Foto
            </label>
            {form.items.length > 1 && (
              <button onClick={() => removeItem(i)} aria-label="Remover item"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: K.muted, padding: 6, display: "flex", flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = K.err}
                onMouseLeave={e => e.currentTarget.style.color = K.muted}>
                <Icon name="x" size={16} />
              </button>
            )}
          </div>
        ))}
        <div style={{ marginTop: 10, marginBottom: 16 }}>
          <Btn kind="secondary" size="sm" icon="plus" onClick={addItem}>Adicionar item</Btn>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn kind="primary" icon={editId ? "check" : "plus"} onClick={save}>{editId ? "Salvar alterações" : "Criar checklist"}</Btn>
          {editId && <Btn kind="secondary" icon="x" onClick={() => { setEditId(null); setForm(empty); }}>Cancelar</Btn>}
        </div>
      </Card>

      {/* Existing templates */}
      {templates.length > 0 && (
        <div style={{ ...T.caption, color: K.muted, marginBottom: 12 }}>CHECKLISTS CRIADOS ({templates.length})</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {templates.map(t => {
          const catColor = CL_CAT_COLORS[t.category] || K.muted;
          return (
            <Card key={t.id} padding={16}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                  <span style={{ ...T.bodyB, color: K.text }}>{t.title}</span>
                  <Chip icon={CL_CAT_ICONS[t.category]} color={catColor} bg={`${catColor}1A`}>{t.category}</Chip>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => startEdit(t)} title="Editar"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: K.muted, padding: 6, display: "flex" }}
                    onMouseEnter={e => e.currentTarget.style.color = K.text}
                    onMouseLeave={e => e.currentTarget.style.color = K.muted}>
                    <Icon name="edit" size={16} />
                  </button>
                  <button onClick={() => remove(t.id)} title="Remover"
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: K.muted, padding: 6, display: "flex" }}
                    onMouseEnter={e => e.currentTarget.style.color = K.err}
                    onMouseLeave={e => e.currentTarget.style.color = K.muted}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {t.items.map((item, i) => (
                  <div key={i} style={{ ...T.small, color: K.text2, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${K.borderStrong}`, flexShrink: 0 }} />
                    <span style={{ flex: 1, minWidth: 0 }}>{item.text}</span>
                    {item.requiresPhoto && <Icon name="camera" size={13} color={K.orange} />}
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKLIST: DO (execute checklists)
// ═══════════════════════════════════════════════════════════════════════════

function ChecklistDo({ templates, completions, onComplete, currentUser, onPhotoClick }) {
  // ACTIVE ID persistido em localStorage. Crítico no iPhone: se o Safari
  // matar a página enquanto a câmera está aberta, o user retorna pra mesma
  // tela em vez de cair na home do checklist (e perder o rascunho mid-flow).
  const [activeId, setActiveId] = useState(() => {
    try { return localStorage.getItem("kuali_active_checklist") || null; } catch { return null; }
  });
  useEffect(() => {
    try {
      if (activeId) localStorage.setItem("kuali_active_checklist", activeId);
      else localStorage.removeItem("kuali_active_checklist");
    } catch { }
  }, [activeId]);

  const [checked, setChecked] = useState({});
  const [photos, setPhotos] = useState({});
  const [saving, setSaving] = useState(false);
  // Index do item cuja foto está sendo processada agora (dá feedback visual)
  const [photoLoading, setPhotoLoading] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);

  // Input de arquivo PERSISTENTE em JSX (ref'd por React). Crítico no iPhone:
  // - inputs criados via document.createElement e .removeChild dão chance pro
  //   GC do iOS reciclar enquanto a câmera está aberta, e o onchange morre
  // - input renderizado por React e mantido no DOM sobrevive ao reload
  // - guardamos qual item alvo num ref pra saber onde a foto vai cair quando
  //   onchange disparar (mesmo que o React tenha re-renderizado entre o click
  //   e o callback)
  const fileInputRef = useRef(null);
  const photoTargetRef = useRef(null);

  // Indicador de fila pendente / online no header da tarefa
  useEffect(() => {
    const update = () => {
      setIsOnline(navigator.onLine);
      try { setPendingCount(JSON.parse(localStorage.getItem("pendingClCompletions") || "[]").length); }
      catch { setPendingCount(0); }
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    const t = setInterval(update, 5000);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); clearInterval(t); };
  }, []);

  const today = todayISO();

  // ── Persistência de rascunho ──
  // Cada (template, usuário, dia) tem sua própria chave; assim duas pessoas
  // podem retomar checklists diferentes no mesmo aparelho sem misturar dados.
  const draftKey = activeId ? `kuali_draft_${activeId}_${currentUser.id}_${today}` : null;

  // Restaura rascunho ao abrir um checklist (ou limpa estado ao trocar)
  useEffect(() => {
    if (!activeId || !draftKey) {
      setChecked({});
      setPhotos({});
      return;
    }
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      setChecked(saved?.checked || {});
      setPhotos(saved?.photos || {});
    } catch {
      setChecked({});
      setPhotos({});
    }
  }, [activeId, draftKey]);

  // Salva rascunho a cada mudança em checked/photos. Se localStorage estourar
  // quota (muitas fotos pesadas), apenas avisa no console — não trava o user.
  useEffect(() => {
    if (!activeId || !draftKey) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ checked, photos, savedAt: Date.now() }));
    } catch (err) {
      console.warn("Não foi possível salvar rascunho do checklist:", err);
    }
  }, [activeId, draftKey, checked, photos]);

  // Limpa rascunhos antigos (mais de 2 dias) na montagem do componente
  useEffect(() => {
    try {
      const now = Date.now();
      const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("kuali_draft_")) continue;
        try {
          const v = JSON.parse(localStorage.getItem(key));
          if (!v?.savedAt || now - v.savedAt > TWO_DAYS) localStorage.removeItem(key);
        } catch { localStorage.removeItem(key); }
      }
    } catch { }
  }, []);

  // A checklist is "done today" if completed today by ANY user
  const doneToday = (tplId) => completions.some(c => c.templateId === tplId && c.date === today);
  // Get who completed it today
  const doneTodayBy = (tplId) => {
    const c = completions.find(c => c.templateId === tplId && c.date === today);
    return c ? c.userName : null;
  };

  const startChecklist = (tpl) => {
    setActiveId(tpl.id);
    // checked/photos são restaurados pelo useEffect acima
  };

  // Compressor agressivo: 800×, qualidade 0.55. Em testes reais isso fica
  // tipicamente em 50–120KB por foto (vs 200–400KB do 1024/0.65), o que
  // reduz drasticamente a pressão de memória durante o draw no canvas — a
  // principal causa do iOS evict a página inteira.
  // Para fotos muito grandes (>4000px), faz downsample em duas etapas pra
  // evitar o limite de tamanho de canvas do iOS (≈16Mpx no iPhone 8/X).
  const compressImage = (file, maxW = 800, quality = 0.55) => new Promise((resolve, reject) => {
    const TIMEOUT_MS = 25000;
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error("Tempo esgotado")); } }, TIMEOUT_MS);
    const finishOk = (v) => { if (!settled) { settled = true; clearTimeout(timer); resolve(v); } };
    const finishErr = (e) => { if (!settled) { settled = true; clearTimeout(timer); reject(e); } };

    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        try {
          // Downsample em 2 etapas se > 2× alvo (qualidade melhor que 1 etapa)
          let srcW = img.width, srcH = img.height;
          let source = img;
          if (srcW > maxW * 2) {
            const midW = Math.round(srcW / 2);
            const midH = Math.round(srcH / 2);
            const mid = document.createElement("canvas");
            mid.width = midW; mid.height = midH;
            mid.getContext("2d").drawImage(img, 0, 0, midW, midH);
            source = mid; srcW = midW; srcH = midH;
          }
          const scale = Math.min(1, maxW / srcW);
          const w = Math.round(srcW * scale);
          const h = Math.round(srcH * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(source, 0, 0, w, h);
          finishOk(canvas.toDataURL("image/jpeg", quality));
        } catch (err) { finishErr(err); }
      };
      img.onerror = () => finishErr(new Error("Decode falhou (HEIC?)"));
      img.src = ev.target.result;
    };
    reader.onerror = () => finishErr(new Error("FileReader falhou"));
    reader.readAsDataURL(file);
  });

  // Click no botão "Tirar foto": só guarda o item alvo num ref + reseta o
  // value do input + dispara click. O onChange real está no JSX do input.
  const handlePhoto = (itemIdx) => {
    if (photoLoading !== null) return;
    photoTargetRef.current = itemIdx;
    const input = fileInputRef.current;
    if (!input) return;
    // CRÍTICO: reseta value pra garantir que onChange dispara mesmo se o user
    // tirar duas fotos seguidas (mesmo "nome" → mesmo File.name → iOS pode
    // suprimir o evento sem reset).
    input.value = "";
    input.click();
  };

  // Handler conectado ao input renderizado em JSX. Sobrevive a re-renders,
  // não é GC'd enquanto câmera tá aberta, e funciona após Safari reload
  // porque é parte do componente persistente.
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    const itemIdx = photoTargetRef.current;
    photoTargetRef.current = null;
    // Reset imediato — libera memória do File e garante próximo click funcione
    try { e.target.value = ""; } catch { }
    if (!file || itemIdx === null || itemIdx === undefined) return;

    setPhotoLoading(itemIdx);
    try {
      const dataUrl = await compressImage(file);
      setPhotos(prev => ({ ...prev, [itemIdx]: [...(prev[itemIdx] || []), dataUrl] }));
    } catch (err) {
      console.error("Foto falhou:", err);
      alert("Não consegui processar essa foto.\n\n• Tente tirar de novo (no iPhone às vezes precisa)\n• Ou escolha da galeria em vez de tirar agora");
    } finally {
      setPhotoLoading(null);
    }
  };

  const removePhoto = (itemIdx, photoIdx) => {
    setPhotos(prev => {
      const arr = [...(prev[itemIdx] || [])];
      arr.splice(photoIdx, 1);
      return { ...prev, [itemIdx]: arr };
    });
  };

  const submit = async (tpl) => {
    if (saving) return;
    const allChecked = tpl.items.every((_, i) => checked[i]);
    const photosOk = tpl.items.every((item, i) => !item.requiresPhoto || (photos[i] && photos[i].length > 0));
    if (!allChecked) return alert("Complete todos os itens antes de finalizar.");
    if (!photosOk) return alert("Tire foto dos itens obrigatórios.");

    const comp = {
      id: uid(), templateId: tpl.id, templateTitle: tpl.title, category: tpl.category,
      userId: currentUser.id, userName: currentUser.name,
      date: today, time: nowTime(), timestamp: Date.now(),
      items: tpl.items.map((item, i) => ({ text: item.text, photos: photos[i] || [] })),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    };

    setSaving(true);
    const finishUI = () => {
      // Limpa rascunho local agora que o checklist foi entregue (ou enfileirado)
      try { if (draftKey) localStorage.removeItem(draftKey); } catch { }
      setActiveId(null); setChecked({}); setPhotos({});
    };
    try {
      await onComplete(comp);
      finishUI();
    } catch {
      // Já foi salvo no localStorage pelo addClCompletion — vai retransmitir sozinho.
      alert("✅ Checklist salvo no aparelho.\n\nA conexão falhou agora, mas o app vai enviar automaticamente em segundo plano. Pode continuar usando normalmente.");
      finishUI();
    } finally {
      setSaving(false);
    }
  };

  const activeTpl = templates.find(t => t.id === activeId);

  // Group templates by category
  const grouped = CL_CATS.reduce((acc, cat) => {
    const items = templates.filter(t => t.category === cat);
    if (items.length) acc.push({ cat, items });
    return acc;
  }, []);

  // ── Active task screen (checkbox + foto) ──
  if (activeTpl) {
    const catColor = CL_CAT_COLORS[activeTpl.category] || K.muted;
    const catIcon = CL_CAT_ICONS[activeTpl.category] || "note";
    const doneCount = activeTpl.items.filter((_, i) => checked[i]).length;
    const pct = Math.round((doneCount / activeTpl.items.length) * 100);

    return (
      <div className="kuali-anim" style={{ background: K.ink, minHeight: "100vh", color: K.text, fontFamily: FONT, paddingBottom: 140 }}>
        {/* Input de arquivo persistente — fica no JSX o tempo todo na tela ativa.
            Importante NÃO recriar a cada render: fileInputRef garante isso. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          style={{ position: "fixed", left: -9999, top: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        />

        {/* Header sticky */}
        <div style={{ position: "sticky", top: 0, zIndex: 5, padding: "12px 16px 14px", borderBottom: `1px solid ${K.border}`, background: K.ink, maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <button onClick={() => setActiveId(null)} aria-label="Voltar"
              style={{ width: 40, height: 40, borderRadius: 10, background: K.surface2, border: `1px solid ${K.border}`, color: K.text, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
              <Icon name="arrow-left" size={20} />
            </button>
            {(!isOnline || pendingCount > 0) && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: K.yellow, ...T.small, fontWeight: 700 }}>
                <Icon name="wifi-off" size={14} /> {isOnline ? `${pendingCount} na fila` : `Offline · ${pendingCount} na fila`}
              </div>
            )}
            <div style={{ width: 40 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <Chip icon={catIcon} color={catColor} bg={`${catColor}22`}>{activeTpl.category}</Chip>
            <span style={{ ...T.small, color: K.muted }}>{currentUser.name} · {today}</span>
            {/* Indicador de rascunho — informa que pode fechar/atualizar sem perder */}
            {(doneCount > 0 || Object.keys(photos).length > 0) && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: K.green, ...T.small, fontWeight: 700, marginLeft: "auto" }}
                title="Seu progresso é salvo automaticamente">
                <Icon name="cloud-check" size={12} /> Rascunho salvo
              </span>
            )}
          </div>
          <div style={{ ...T.h1, color: K.text }}>{activeTpl.title}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <div style={{ flex: 1, height: 6, background: K.surface2, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: K.orange, transition: "width 300ms ease-out" }} />
            </div>
            <div style={{ ...T.small, color: K.text, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{doneCount}/{activeTpl.items.length}</div>
          </div>
        </div>

        {/* Items list */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "12px 16px" }}>
          {activeTpl.items.map((item, i) => {
            const done = !!checked[i];
            const photoTaken = (photos[i] || []).length > 0;
            // Item "atual" = primeiro pendente (foco visual)
            const firstPending = activeTpl.items.findIndex((_, idx) => !checked[idx]);
            const isCurrent = !done && i === firstPending;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "14px 14px",
                background: isCurrent ? `${K.orange}0F` : "transparent",
                borderRadius: 12,
                border: isCurrent ? `1px solid ${K.orange}55` : "1px solid transparent",
                borderBottom: isCurrent ? `1px solid ${K.orange}55` : `1px solid ${K.border}`,
                marginBottom: isCurrent ? 8 : 0,
              }}>
                <button
                  onClick={() => setChecked(prev => ({ ...prev, [i]: !prev[i] }))}
                  aria-label={done ? "Desmarcar" : "Marcar"}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: done ? K.green : isCurrent ? K.surface2 : "transparent",
                    border: done ? `2px solid ${K.green}` : isCurrent ? `2px solid ${K.orange}` : `2px solid ${K.borderStrong}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: 1, cursor: "pointer",
                    transition: "background 150ms ease, border-color 150ms ease",
                  }}>
                  {done && <Icon name="check-bold" size={18} color={K.black} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    ...T.body,
                    color: done ? K.muted : K.text,
                    fontWeight: isCurrent ? 600 : 400,
                    textDecoration: done ? "line-through" : "none",
                  }}>{item.text}</div>
                  {item.requiresPhoto && (
                    <div style={{ marginTop: 10 }}>
                      {photoTaken ? (
                        <>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                            {(photos[i] || []).map((photo, pi) => (
                              <div key={pi} style={{ position: "relative" }}>
                                <img src={photo} onClick={() => onPhotoClick(photo)}
                                  style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 10, border: `1px solid ${K.border}`, cursor: "pointer" }} />
                                <button onClick={() => removePhoto(i, pi)} aria-label="Remover foto"
                                  style={{ position: "absolute", top: -6, right: -6, background: K.err, border: "none", borderRadius: "50%", width: 20, height: 20, color: K.white, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                  <Icon name="x" size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => handlePhoto(i)} disabled={photoLoading === i}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: K.green, ...T.small, fontWeight: 700, cursor: photoLoading === i ? "wait" : "pointer", padding: 0, opacity: photoLoading === i ? 0.6 : 1 }}>
                            {photoLoading === i
                              ? <><Icon name="spinner" size={14} spin /> Processando…</>
                              : <><Icon name="check-circle" size={14} /> Foto enviada · adicionar mais</>}
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handlePhoto(i)} disabled={photoLoading === i} style={{
                          height: 44, padding: "0 16px",
                          background: K.surface2,
                          border: `1px dashed ${photoLoading === i ? K.orange : K.borderStrong}`,
                          borderRadius: 10,
                          color: K.text,
                          display: "inline-flex", alignItems: "center", gap: 8,
                          fontFamily: FONT, fontSize: 14, fontWeight: 600,
                          cursor: photoLoading === i ? "wait" : "pointer",
                          opacity: photoLoading === i ? 0.7 : 1,
                          transition: "all 150ms ease",
                        }}>
                          {photoLoading === i
                            ? <><Icon name="spinner" size={18} color={K.orange} spin /> Processando foto…</>
                            : <><Icon name="camera" size={18} color={K.orange} /> Tirar foto obrigatória</>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sticky CTA */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10,
          padding: "14px 16px calc(env(safe-area-inset-bottom, 14px) + 14px)",
          background: `linear-gradient(to top, ${K.ink} 60%, ${K.ink}00)`,
        }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <Btn size="xl" full kind="primary" icon="check-bold" loading={saving} onClick={() => submit(activeTpl)}>
              {saving ? "Salvando — mantenha o app aberto" : "Finalizar checklist"}
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  // ── Home — lista de checklists por categoria ──
  const totalItems = templates.reduce((acc, t) => acc + t.items.length, 0);
  const totalDoneToday = completions.filter(c => c.date === today).reduce((acc, c) => acc + (c.items?.length || 0), 0);

  return (
    <div className="kuali-anim" style={{ padding: "16px 20px 40px", maxWidth: 720, margin: "0 auto", color: K.text, fontFamily: FONT }}>
      {/* Top status row (online + pending) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, ...T.small, color: K.text2 }}>
          <StatusDot kind={isOnline ? "ok" : "warn"} size={7} />
          {isOnline ? "Online" : "Offline"}
          {pendingCount > 0 && <span style={{ color: K.yellow, fontWeight: 700 }}>· {pendingCount} na fila</span>}
        </span>
        <span style={{ ...T.caption, color: K.orange }}>{today}</span>
      </div>

      <div style={{ ...T.h1, color: K.text, marginBottom: 4 }}>Olá, {currentUser.name.split(" ")[0]}.</div>
      <div style={{ ...T.body, color: K.text2, marginBottom: 18 }}>
        {templates.length === 0 ? "Nenhum checklist criado ainda."
          : `${grouped.reduce((a, g) => a + g.items.filter(t => !doneToday(t.id)).length, 0)} checklists pendentes hoje.`}
      </div>

      {/* Progress strip */}
      {templates.length > 0 && (
        <Card padding={14} style={{ marginBottom: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ ...T.small, color: K.text2 }}>Progresso do dia</span>
            <span style={{ ...T.small, color: K.text, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{totalDoneToday} / {totalItems}</span>
          </div>
          <div style={{ height: 6, background: K.surface2, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: totalItems ? `${Math.min(100, (totalDoneToday / totalItems) * 100)}%` : "0%", height: "100%", background: K.orange, borderRadius: 4, transition: "width 300ms ease-out" }} />
          </div>
        </Card>
      )}

      {templates.length === 0 && (
        <Card padding={32} style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: K.surface2, color: K.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Icon name="list" size={24} />
          </div>
          <div style={{ ...T.bodyB, color: K.text }}>Nenhum checklist criado ainda</div>
          <div style={{ ...T.small, color: K.muted, marginTop: 4 }}>Peça ao administrador para criar checklists</div>
        </Card>
      )}

      {grouped.length > 0 && <div style={{ ...T.caption, color: K.muted, marginBottom: 10 }}>CATEGORIAS</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {grouped.map(({ cat, items }) => {
          const color = CL_CAT_COLORS[cat] || K.muted;
          const catIcon = CL_CAT_ICONS[cat] || "note";
          const doneInCat = items.filter(t => doneToday(t.id)).length;
          const allDone = doneInCat === items.length;
          const pct = Math.round((doneInCat / items.length) * 100);
          return (
            <div key={cat}>
              <div style={{
                background: K.surface,
                border: `1px solid ${K.border}`,
                borderRadius: 14,
                padding: 16,
                display: "flex",
                alignItems: "center",
                gap: 14,
                position: "relative",
                overflow: "hidden",
                marginBottom: 8,
              }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: color }} />
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}1A`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
                  <Icon name={catIcon} size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ ...T.h3, color: K.text }}>{cat}</div>
                    <div style={{ ...T.small, color: K.muted, fontVariantNumeric: "tabular-nums" }}>{doneInCat}/{items.length}</div>
                  </div>
                  <div style={{ ...T.small, color: K.text2, marginTop: 2 }}>{items.length === 1 ? "1 checklist" : `${items.length} checklists`}</div>
                  <div style={{ height: 3, background: K.surface2, borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: allDone ? K.green : color, transition: "width 300ms ease-out" }} />
                  </div>
                </div>
              </div>
              {/* Templates dentro da categoria */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                {items.map(t => {
                  const done = doneToday(t.id);
                  const doneBy = doneTodayBy(t.id);
                  const hasPhoto = t.items.some(i => i.requiresPhoto);
                  return (
                    <div key={t.id} onClick={() => !done && startChecklist(t)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px",
                        background: K.surface2,
                        border: `1px solid ${K.border}`,
                        borderRadius: 10,
                        cursor: done ? "default" : "pointer",
                        opacity: done ? 0.65 : 1,
                        transition: "border-color 150ms ease",
                      }}
                      onMouseEnter={e => { if (!done) e.currentTarget.style.borderColor = K.borderStrong; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = K.border; }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: done ? K.green : "transparent",
                        border: done ? `2px solid ${K.green}` : `2px solid ${K.borderStrong}`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        {done && <Icon name="check-bold" size={14} color={K.black} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ ...T.bodyB, color: done ? K.text2 : K.text, textDecoration: done ? "line-through" : "none" }}>{t.title}</div>
                        <div style={{ ...T.small, color: K.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                          {t.items.length} itens
                          {hasPhoto && <><span>·</span><Icon name="camera" size={12} color={K.muted} /> requer foto</>}
                        </div>
                      </div>
                      {done ? (
                        <span style={{ ...T.small, color: K.green, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <Icon name="check-circle" size={14} /> {doneBy || "Feito"}
                        </span>
                      ) : (
                        <Icon name="chevron-right" size={18} color={K.muted} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKLIST: ANALYSIS DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

function ChecklistAnalysis({ completions, users, onPhotoClick }) {
  const [filterDate, setFilterDate] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [detailCache, setDetailCache] = useState({}); // { [id]: items[] with photos }
  const [loadingId, setLoadingId] = useState(null);

  const toggleExpand = async (c) => {
    if (expandedId === c.id) { setExpandedId(null); return; }
    setExpandedId(c.id);
    if (detailCache[c.id]) return;
    setLoadingId(c.id);
    try {
      const r = await fetch(`/api/cl-completions/${c.id}`);
      if (r.ok) {
        const full = await r.json();
        setDetailCache(prev => ({ ...prev, [c.id]: full.items || [] }));
      }
    } catch { }
    finally { setLoadingId(null); }
  };

  const today = todayISO();
  const sevenDaysAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();

  // Only show completions within 7-day review window (but keep data)
  const viewable = completions.filter(c => c.expiresAt >= today);
  const expired = completions.filter(c => c.expiresAt < today);

  const filtered = viewable.filter(c => {
    if (filterDate && c.date !== filterDate) return false;
    if (filterUser !== "all" && c.userId !== filterUser) return false;
    if (filterCat !== "all" && c.category !== filterCat) return false;
    return true;
  }).sort((a, b) => b.timestamp - a.timestamp);

  // Stats
  const totalThisWeek = viewable.length;
  const uniqueDays = [...new Set(viewable.map(c => c.date))].length;
  const uniqueUsers = [...new Set(viewable.map(c => c.userId))].length;
  const byCat = viewable.reduce((acc, c) => { acc[c.category] = (acc[c.category] || 0) + 1; return acc; }, {});

  const inputStyle = {
    width: "100%", background: K.surface2, border: `1px solid ${K.border}`,
    borderRadius: 10, padding: "10px 12px", color: K.text,
    fontFamily: FONT, fontSize: 14, outline: "none", colorScheme: "dark",
  };

  return (
    <div className="kuali-anim" style={{ padding: "20px 16px 32px", maxWidth: 960, margin: "0 auto", fontFamily: FONT }}>
      {/* Info banner */}
      <Card padding={14} style={{ marginBottom: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: K.yellow }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: `${K.yellow}1A`, color: K.yellow, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="clock" size={16} />
          </div>
          <div style={{ ...T.small, color: K.text2, flex: 1, minWidth: 0 }}>
            Checklists ficam disponíveis por <span style={{ color: K.yellow, fontWeight: 700 }}>7 dias</span>. Depois disso somem da visualização (mas os dados ficam guardados).
          </div>
          {expired.length > 0 && (
            <span style={{ ...T.caption, color: K.muted, whiteSpace: "nowrap", fontFamily: MONO, flexShrink: 0 }}>
              {expired.length} expirados
            </span>
          )}
        </div>
      </Card>

      {/* Filters */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Data</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Funcionário</label>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={inputStyle}>
            <option value="all">Todos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Categoria</label>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={inputStyle}>
            <option value="all">Todas</option>
            {CL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      {filterDate && (
        <div style={{ marginBottom: 16 }}>
          <Btn kind="ghost" size="sm" icon="x" onClick={() => setFilterDate("")} style={{ color: K.muted }}>Limpar data</Btn>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
        {[
          { label: "CHECKLISTS (7 DIAS)", value: totalThisWeek, icon: "list" },
          { label: "DIAS COM REGISTROS", value: uniqueDays, icon: "clock" },
          { label: "FUNCIONÁRIOS ATIVOS", value: uniqueUsers, icon: "user" },
        ].map(s => (
          <Card key={s.label} padding={14}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon name={s.icon} size={14} color={K.orange} />
              <span style={{ ...T.caption, color: K.muted, fontSize: 10 }}>{s.label}</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: K.text, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>{s.value}</div>
          </Card>
        ))}
      </div>

      {/* By category */}
      {Object.keys(byCat).length > 0 && (
        <Card padding={16} style={{ marginBottom: 20 }}>
          <div style={{ ...T.caption, color: K.muted, marginBottom: 12 }}>POR CATEGORIA</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
              const color = CL_CAT_COLORS[cat] || K.muted;
              return (
                <span key={cat} style={{
                  padding: "6px 12px", borderRadius: 9999,
                  background: `${color}1A`, color, border: `1px solid ${color}55`,
                  display: "inline-flex", alignItems: "center", gap: 6,
                  ...T.small, fontWeight: 700,
                }}>
                  <Icon name={CL_CAT_ICONS[cat] || "note"} size={12} /> {cat} <span style={{ ...T.mono, opacity: 0.7 }}>· {count}</span>
                </span>
              );
            })}
          </div>
        </Card>
      )}

      {/* Completion list */}
      {filtered.length === 0 && (
        <Card padding={40} style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: K.surface2, color: K.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Icon name="list" size={22} />
          </div>
          <div style={{ ...T.bodyB, color: K.text }}>Nenhum checklist no período</div>
          <div style={{ ...T.small, color: K.muted, marginTop: 4 }}>Ajuste os filtros pra ver registros antigos</div>
        </Card>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(c => {
          const catColor = CL_CAT_COLORS[c.category] || K.muted;
          const isOpen = expandedId === c.id;
          return (
            <Card key={c.id} padding={16}>
              <div onClick={() => toggleExpand(c)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: 1 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: `${K.green}1A`, color: K.green, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name="check-circle" size={18} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...T.bodyB, color: K.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.templateTitle}</div>
                    <div style={{ ...T.small, color: K.muted, marginTop: 2 }}>{c.userName} · {formatDateBR(c.date)} às <span style={T.mono}>{c.time}</span></div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <Chip icon={CL_CAT_ICONS[c.category]} color={catColor} bg={`${catColor}1A`}>{c.category}</Chip>
                  <span style={{ display: "flex", color: K.muted, transform: isOpen ? "rotate(180deg)" : "rotate(0)", transition: "transform 200ms ease" }}>
                    <Icon name="chevron-down" size={16} />
                  </span>
                </div>
              </div>
              {isOpen && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${K.border}` }}>
                  {loadingId === c.id && !detailCache[c.id] && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, ...T.small, color: K.text2, padding: "4px 0" }}>
                      <Icon name="spinner" size={14} spin /> Carregando detalhes…
                    </div>
                  )}
                  {(detailCache[c.id] || []).map((item, i) => {
                    const photos = item.photos || (item.photo ? [item.photo] : []);
                    return (
                      <div key={i} style={{ marginBottom: 12 }}>
                        <div style={{ ...T.body, fontSize: 14, color: K.text2, display: "flex", alignItems: "center", gap: 8 }}>
                          <Icon name="check-circle" size={14} color={K.green} /> {item.text}
                        </div>
                        {photos.length > 0 && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, marginLeft: 22 }}>
                            {photos.map((photo, pi) => (
                              <img key={pi} src={photo} onClick={() => onPhotoClick(photo)}
                                style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 10, border: `1px solid ${K.border}`, cursor: "pointer", transition: "opacity 150ms ease" }}
                                title="Clique para ampliar"
                                onMouseEnter={e => e.currentTarget.style.opacity = 0.8}
                                onMouseLeave={e => e.currentTarget.style.opacity = 1} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ ...T.caption, color: K.muted, marginTop: 8 }}>EXPIRA EM <span style={T.mono}>{formatDateBR(c.expiresAt)}</span></div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUÇÃO
// ═══════════════════════════════════════════════════════════════════════════

function formatCountdown(ms) {
  if (ms <= 0) return "0s";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

function ProductionControlView({ items, cycle, onUpdateItem, onUpdateCycle }) {
  const [now, setNow] = useState(new Date());
  const [drafts, setDrafts] = useState({});

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const currentCycleKey = getCurrentCycleKey(now);
  const nextCycleStart = getNextCycleStart(now);
  const locked = cycle.cycleKey === currentCycleKey && !!cycle.concludedAt;
  const cycleTransitioned = cycle.cycleKey && cycle.cycleKey !== currentCycleKey;

  useEffect(() => {
    if (cycleTransitioned) {
      onUpdateCycle({ cycleKey: null, concludedAt: null });
    }
  }, [cycleTransitioned, onUpdateCycle]);

  const visibleQty = (item) => {
    if (item.cycleKey !== currentCycleKey) return null;
    return item.qty;
  };

  const getDraft = (item) => {
    if (drafts[item.id] !== undefined) return drafts[item.id];
    const q = visibleQty(item);
    return q == null ? "" : String(q);
  };

  const saveDraft = (item) => {
    const raw = drafts[item.id];
    if (raw === undefined) return;
    const num = raw === "" ? null : Number(raw);
    const qty = Number.isFinite(num) ? num : null;
    onUpdateItem(item.id, { qty, cycleKey: qty == null ? null : currentCycleKey });
    setDrafts(prev => { const { [item.id]: _, ...rest } = prev; return rest; });
  };

  const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  const allFilled = sorted.length > 0 && sorted.every(i => i.cycleKey === currentCycleKey && i.qty != null);
  const belowMin = sorted.filter(i => i.cycleKey === currentCycleKey && i.qty != null && i.qty < (i.minQty || 0));

  const concluir = () => {
    if (!allFilled) return alert("Preencha as quantidades de todos os itens antes de concluir.");
    onUpdateCycle({ cycleKey: currentCycleKey, concludedAt: new Date().toISOString() });
  };

  const reabrir = () => {
    if (!confirm("Reabrir o ciclo para edição?")) return;
    onUpdateCycle({ cycleKey: currentCycleKey, concludedAt: null });
  };

  if (sorted.length === 0) {
    return (
      <div className="kuali-anim" style={{ padding: "60px 16px", maxWidth: 480, margin: "0 auto" }}>
        <Card padding={36} style={{ textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: K.surface2, color: K.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <Icon name="production" size={28} />
          </div>
          <div style={{ ...T.bodyB, color: K.text }}>Nenhum item de produção cadastrado</div>
          <div style={{ ...T.small, color: K.muted, marginTop: 6 }}>Um administrador precisa adicionar itens em "Gerenciar itens".</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="kuali-anim" style={{ padding: "20px 16px 32px", maxWidth: 720, margin: "0 auto", fontFamily: FONT }}>
      <Card padding={14} style={{ marginBottom: 14, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: locked ? K.green : K.orange }} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: locked ? `${K.green}1A` : `${K.orange}1A`, color: locked ? K.green : K.orange, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name={locked ? "check-circle" : "production"} size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...T.bodyB, color: K.text }}>
              {locked ? "Ciclo concluído" : "Ciclo aberto para edição"}
            </div>
            <div style={{ ...T.small, color: K.muted, marginTop: 2 }}>
              {locked
                ? <>Reabre em <span style={T.mono}>{formatCountdown(nextCycleStart - now)}</span> · próximo ciclo às 21h</>
                : `Registre as quantidades e clique em "Concluir"`}
            </div>
          </div>
          {locked && <Btn kind="secondary" size="sm" onClick={reabrir}>Reabrir</Btn>}
        </div>
      </Card>

      {belowMin.length > 0 && !locked && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", marginBottom: 12, background: `${K.err}1A`, border: `1px solid ${K.err}55`, borderRadius: 10, color: K.err, ...T.small, fontWeight: 600 }}>
          <Icon name="alert" size={16} />
          {belowMin.length} {belowMin.length === 1 ? "item abaixo" : "itens abaixo"} da quantidade mínima
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map(item => {
          const q = visibleQty(item);
          const filled = q != null;
          const isAlert = filled && q < (item.minQty || 0);
          return (
            <div key={item.id} style={{
              background: K.surface, border: `1px solid ${K.border}`, borderRadius: 12,
              padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
              position: "relative", overflow: "hidden",
            }}>
              {isAlert && <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: K.err }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...T.bodyB, color: K.text }}>{item.name}</div>
                <div style={{ ...T.small, color: isAlert ? K.err : K.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                  {isAlert && <Icon name="alert" size={12} />}
                  {isAlert ? `Abaixo do mínimo (${item.minQty} ${item.unit})` : `Mínimo: ${item.minQty || 0} ${item.unit}`}
                </div>
              </div>
              {locked ? (
                <div style={{ ...T.mono, fontSize: 16, fontWeight: 700, color: isAlert ? K.err : K.green, minWidth: 80, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {filled ? `${q} ${item.unit}` : "—"}
                </div>
              ) : (
                <>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={getDraft(item)}
                    onChange={e => setDrafts(prev => ({ ...prev, [item.id]: e.target.value }))}
                    onBlur={() => saveDraft(item)}
                    onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }}
                    placeholder="0"
                    onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
                    style={{ width: 80, background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 8, padding: "8px 10px", color: K.text, fontFamily: MONO, fontSize: 15, fontWeight: 600, textAlign: "right", outline: "none" }}
                  />
                  <div style={{ ...T.small, color: K.muted, minWidth: 32 }}>{item.unit}</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {!locked && (
        <div style={{ marginTop: 16 }}>
          <Btn kind={allFilled ? "success" : "secondary"} size="lg" full disabled={!allFilled} icon="check-bold" onClick={concluir}>
            Concluir ciclo de hoje
          </Btn>
        </div>
      )}
    </div>
  );
}

function ProductionManageView({ items, onAdd, onUpdate, onRemove }) {
  const [form, setForm] = useState({ name: "", unit: "und", minQty: "" });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", unit: "und", minQty: "" });

  const sorted = [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));

  const save = () => {
    if (!form.name.trim()) return;
    onAdd({ name: form.name.trim(), unit: form.unit.trim() || "und", minQty: Number(form.minQty) || 0 });
    setForm({ name: "", unit: "und", minQty: "" });
  };

  const startEdit = (i) => {
    setEditId(i.id);
    setEditForm({ name: i.name, unit: i.unit || "und", minQty: String(i.minQty ?? 0) });
  };

  const saveEdit = () => {
    if (!editForm.name.trim()) return;
    onUpdate(editId, { name: editForm.name.trim(), unit: editForm.unit.trim() || "und", minQty: Number(editForm.minQty) || 0 });
    setEditId(null);
  };

  const remove = (id) => {
    if (!confirm("Remover este item de produção?")) return;
    onRemove(id);
  };

  const inputStyle = {
    width: "100%", background: K.surface2, border: `1px solid ${K.border}`,
    borderRadius: 10, padding: "10px 12px", color: K.text,
    fontFamily: FONT, fontSize: 14, outline: "none",
  };

  return (
    <div className="kuali-anim" style={{ padding: "20px 16px 32px", maxWidth: 720, margin: "0 auto", fontFamily: FONT }}>
      <Card padding={18} style={{ marginBottom: 18 }}>
        <div style={{ ...T.caption, color: K.muted, marginBottom: 14 }}>ADICIONAR ITEM DE PRODUÇÃO</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12, marginBottom: 14 }}>
          <div>
            <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Nome</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mix de vegetais"
              onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
              onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
              style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Unidade</label>
              <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="und"
                onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
                onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
                style={inputStyle} />
            </div>
            <div>
              <label style={{ ...T.caption, color: K.text2, display: "block", marginBottom: 6 }}>Qtd. mínima</label>
              <input type="number" value={form.minQty} onChange={e => setForm({ ...form, minQty: e.target.value })} placeholder="0"
                onFocus={e => { e.currentTarget.style.borderColor = K.orange; }}
                onBlur={e => { e.currentTarget.style.borderColor = K.border; }}
                style={{ ...inputStyle, fontFamily: MONO }} />
            </div>
          </div>
        </div>
        <Btn kind="primary" icon="plus" onClick={save}>Adicionar item</Btn>
      </Card>

      {sorted.length === 0 && (
        <Card padding={32} style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: K.surface2, color: K.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Icon name="box" size={22} />
          </div>
          <div style={{ ...T.bodyB, color: K.text }}>Nenhum item cadastrado</div>
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sorted.map(i => (
          <div key={i.id} style={{ background: K.surface, border: `1px solid ${K.border}`, borderRadius: 12, padding: "12px 14px" }}>
            {editId === i.id ? (
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 8 }}>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })} style={inputStyle} />
                  <input type="number" value={editForm.minQty} onChange={e => setEditForm({ ...editForm, minQty: e.target.value })} style={{ ...inputStyle, fontFamily: MONO }} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn kind="primary" size="sm" icon="check" onClick={saveEdit}>Salvar</Btn>
                  <Btn kind="secondary" size="sm" icon="x" onClick={() => setEditId(null)}>Cancelar</Btn>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 160px", minWidth: 0 }}>
                  <div style={{ ...T.bodyB, color: K.text }}>{i.name}</div>
                  <div style={{ ...T.small, color: K.muted, marginTop: 2 }}>Mínimo: <span style={T.mono}>{i.minQty || 0} {i.unit}</span></div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn kind="secondary" size="sm" icon="edit" onClick={() => startEdit(i)}>Editar</Btn>
                  <Btn kind="ghost" size="sm" icon="trash" onClick={() => remove(i.id)} style={{ color: K.err }}>Remover</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════

export default function App() {
  // Auth
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("kuali_user")) || null; } catch { return null; }
  });
  useEffect(() => {
    if (currentUser) localStorage.setItem("kuali_user", JSON.stringify(currentUser));
    else localStorage.removeItem("kuali_user");
  }, [currentUser]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Navigation
  const [section, setSection] = useState("compras");
  const [comprasTab, setComprasTab] = useState("notas");
  const [checkTab, setCheckTab] = useState("fazer");
  const [producaoTab, setProducaoTab] = useState("controle");

  // Production
  const [prodItems, setProdItems] = useState([]);
  const [prodCycle, setProdCycle] = useState({ cycleKey: null, concludedAt: null });

  // Invoice data
  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [editingIdx, setEditingIdx] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [comprasView, setComprasView] = useState("table");
  const [processedCount, setProcessedCount] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [period, setPeriod] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const fileRef = useRef();

  useEffect(() => { setPage(1); }, [period, selectedCats, searchText, dateFrom, dateTo]);

  // Checklist data
  const [clTemplates, setClTemplates] = useState([]);
  const [clCompletions, setClCompletions] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ product: "", totalPrice: "", quantity: "", unit: "", category: CATEGORIES[0], supplier: "", date: todayISO() });
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // Reminders
  const [reminders, setReminders] = useState([]);
  const [showReminders, setShowReminders] = useState(false);

  // handleDrop hook before early return
  const handleDrop = useCallback(e => { e.preventDefault(); setDragOver(false); }, []);

  // ── Helpers para fila de checklists pendentes (offline / falha de POST) ──
  const readPendingQueue = useCallback(() => {
    try { return JSON.parse(localStorage.getItem("pendingClCompletions") || "[]"); }
    catch { return []; }
  }, []);
  // Mescla fila pendente com lista do servidor (evita que polling apague optimistic UI)
  const mergePending = useCallback((serverList) => {
    const pending = readPendingQueue();
    if (!pending.length) return serverList;
    const ids = new Set(serverList.map(c => c.id));
    return [...serverList, ...pending.filter(p => !ids.has(p.id))];
  }, [readPendingQueue]);
  // Tenta enviar todos os checklists pendentes; o que falhar continua na fila
  const flushPendingQueue = useCallback(async () => {
    const queue = readPendingQueue();
    if (!queue.length) return;
    const failed = [];
    for (const comp of queue) {
      try {
        const r = await fetch("/api/cl-completions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(comp),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      } catch { failed.push(comp); }
    }
    localStorage.setItem("pendingClCompletions", JSON.stringify(failed));
    if (failed.length < queue.length) {
      // pelo menos um foi enviado — refaz fetch e mescla com remanescentes
      fetch("/api/cl-completions").then(r => r.json()).then(co => setClCompletions(mergePending(co))).catch(() => { });
    }
  }, [readPendingQueue, mergePending]);

  // Dispara o flush em 4 momentos: boot, polling 30s, evento "online" (wifi voltou),
  // e ao voltar pra aba (visibilitychange) — cobre o caso iPhone Safari matar o fetch.
  useEffect(() => {
    if (!currentUser) return;
    flushPendingQueue();
    const interval = setInterval(flushPendingQueue, 30000);
    const onOnline = () => flushPendingQueue();
    const onVisible = () => { if (document.visibilityState === "visible") flushPendingQueue(); };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [currentUser, flushPendingQueue]);

  // ── Load all data from backend (1 request, itens limitados a 500 mais recentes) ──
  useEffect(() => {
    if (!currentUser) return;
    fetch("/api/bootstrap").then(r => r.json()).then(d => {
      setUsers(d.users || []);
      // Se o servidor retornou erro (ex: DATABASE_URL não setada), bootstrap
      // vem como { error: "..." } sem os campos esperados. Detecta e cai pro
      // fallback de fetches individuais — pelo menos /api/users tipicamente
      // ainda funciona se o login funcionou.
      if (d && d.error) {
        console.error("Bootstrap retornou erro:", d.error);
        // Fallback parcial: tenta pelo menos buscar users isoladamente
        fetch("/api/users").then(r => r.json()).then(u => {
          if (Array.isArray(u)) setUsers(u);
        }).catch(() => { });
        setDataLoaded(true);
        return;
      }
      setItems(d.items || []);
      setCatalog(d.catalog || []);
      setClTemplates(d.clTemplates || []);
      setClCompletions(mergePending(d.clCompletions || []));
      setReminders(d.reminders || []);
      setProdItems(d.productionItems || []);
      setProdCycle(d.productionCycle || { cycleKey: null, concludedAt: null });
      if ((d.reminders || []).length > 0) setShowReminders(true);
      setDataLoaded(true);

      // Se houver mais itens além dos 500 recentes, baixa o resto em background
      // (não bloqueia a UI — usuário já pode trabalhar com os itens recentes)
      if (d.itemsTotal && d.itemsTotal > (d.items || []).length) {
        setTimeout(() => {
          fetch("/api/items/all").then(r => r.json()).then(all => {
            if (Array.isArray(all)) setItems(all);
          }).catch(() => { });
        }, 500);
      }
    }).catch(err => {
      console.error("Falha ao carregar bootstrap:", err);
      // Mesmo com bootstrap falhando, tenta /api/users isoladamente
      fetch("/api/users").then(r => r.json()).then(u => {
        if (Array.isArray(u)) setUsers(u);
      }).catch(() => { });
    });
  }, [currentUser]);

  // ── Sync checklist data across devices (poll every 30s) ──
  const refreshChecklists = useCallback(() => {
    Promise.all([
      fetch("/api/cl-completions").then(r => r.json()),
      fetch("/api/cl-templates").then(r => r.json()),
    ]).then(([co, t]) => {
      setClCompletions(mergePending(co));
      setClTemplates(t);
    }).catch(() => { });
  }, [mergePending]);

  // Polling pausável: só roda quando o app está visível (otimização pra iPhone
  // — economiza bateria, dados móveis, e evita queries desnecessárias no
  // Supabase quando ninguém tá olhando).
  useEffect(() => {
    if (!currentUser) return;
    let interval = null;
    const start = () => {
      if (interval) return;
      interval = setInterval(refreshChecklists, 30000);
    };
    const stop = () => { if (interval) { clearInterval(interval); interval = null; } };
    const onVis = () => { document.visibilityState === "visible" ? start() : stop(); };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); stop(); };
  }, [currentUser, refreshChecklists]);

  // Refetch checklists whenever user navigates to the checklists section or switches sub-tabs
  useEffect(() => {
    if (currentUser && section === "checklists") refreshChecklists();
  }, [section, checkTab, currentUser, refreshChecklists]);

  // ── Production: sync ──
  const refreshProduction = useCallback(() => {
    Promise.all([
      fetch("/api/production/items").then(r => r.json()),
      fetch("/api/production/cycle").then(r => r.json()),
    ]).then(([pi, pc]) => {
      setProdItems(pi || []);
      setProdCycle(pc || { cycleKey: null, concludedAt: null });
    }).catch(() => { });
  }, []);
  useEffect(() => {
    if (!currentUser || section !== "producao") return;
    refreshProduction();
    let t = null;
    const start = () => { if (!t) t = setInterval(refreshProduction, 15000); };
    const stop = () => { if (t) { clearInterval(t); t = null; } };
    const onVis = () => { document.visibilityState === "visible" ? start() : stop(); };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); stop(); };
  }, [currentUser, section, refreshProduction]);

  // Refetch users ao entrar na aba "funcionarios" — defesa caso bootstrap
  // tenha falhado ou o admin tenha cadastrado novos funcionários em outro
  // dispositivo.
  useEffect(() => {
    if (!currentUser || section !== "funcionarios") return;
    fetch("/api/users").then(r => r.json()).then(data => {
      if (Array.isArray(data)) setUsers(data);
    }).catch(() => { });
  }, [currentUser, section]);

  // Detecta mobile pra colapsar elementos do header (texto do usuário, label "Sair").
  // IMPORTANTE: precisa estar ANTES do early-return — caso contrário o número de
  // hooks chamados muda entre Login (não logado) e App (logado), violando a
  // Rule of Hooks e crashando o React (tela em branco).
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 640 : false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── LOGIN ──
  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  const isAdmin = currentUser.isAdmin;

  // Logout robusto: limpa state e localStorage, forçando volta pra LoginScreen.
  // É declarado depois do early-return de login pra todos os setters estarem
  // disponíveis (e não estamos chamando dentro de hook, então pode ser função
  // comum em vez de useCallback).
  const logout = () => {
    try {
      localStorage.removeItem("kuali_user");
      // Limpa também caches que poderiam ressuscitar dados do usuário antigo
      localStorage.removeItem("kuali_bootstrap_cache");
    } catch { }
    setItems([]);
    setUsers([]);
    setCatalog([]);
    setClTemplates([]);
    setClCompletions([]);
    setReminders([]);
    setProdItems([]);
    setProdCycle({ cycleKey: null, concludedAt: null });
    setSection("compras");
    setDataLoaded(false);
    setCurrentUser(null);
  };

  // ── API-backed data operations ──
  const api = (url, opts = {}) => fetch(url, { headers: { "Content-Type": "application/json" }, ...opts }).catch(() => { });
  // Reliable POST: throws on failure so caller can react (retry, show error, etc.)
  const apiReliable = async (url, opts = {}) => {
    const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json().catch(() => ({}));
  };

  // Users
  const addUser = (user) => { setUsers(prev => [...prev, user]); api("/api/users", { method: "POST", body: JSON.stringify(user) }); };
  const updateUser = (id, data) => { setUsers(prev => prev.map(u => u.id === id ? { ...u, ...data } : u)); api(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }); };
  const removeUser = (id) => { setUsers(prev => prev.filter(u => u.id !== id)); api(`/api/users/${id}`, { method: "DELETE" }); };

  // Catalog
  const addCatalogItem = (item) => { setCatalog(prev => [...prev, item]); api("/api/catalog", { method: "POST", body: JSON.stringify(item) }); };
  const updateCatalogItem = (id, data) => { setCatalog(prev => prev.map(p => p.id === id ? { ...p, ...data } : p)); api(`/api/catalog/${id}`, { method: "PUT", body: JSON.stringify(data) }); };
  const removeCatalogItem = (id) => { setCatalog(prev => prev.filter(p => p.id !== id)); api(`/api/catalog/${id}`, { method: "DELETE" }); };

  // Checklist Templates
  const addClTemplate = (tpl) => { setClTemplates(prev => [...prev, tpl]); api("/api/cl-templates", { method: "POST", body: JSON.stringify(tpl) }); };
  const updateClTemplate = (id, data) => { setClTemplates(prev => prev.map(t => t.id === id ? { ...t, ...data } : t)); api(`/api/cl-templates/${id}`, { method: "PUT", body: JSON.stringify(data) }); };
  const removeClTemplate = (id) => { setClTemplates(prev => prev.filter(t => t.id !== id)); api(`/api/cl-templates/${id}`, { method: "DELETE" }); };

  // Checklist Completions — em caso de falha, vai pra fila do localStorage e
  // o flushPendingQueue tenta novamente em background (a cada 30s + online + visibility)
  const addClCompletion = async (comp) => {
    setClCompletions(prev => [...prev, comp]);
    // Sempre persiste na fila ANTES do POST. Se o POST der certo, removemos.
    // Garante que mesmo se o iPhone Safari matar o fetch, o checklist não some.
    try {
      const queue = readPendingQueue();
      queue.push(comp);
      localStorage.setItem("pendingClCompletions", JSON.stringify(queue));
    } catch { }
    try {
      await apiReliable("/api/cl-completions", { method: "POST", body: JSON.stringify(comp) });
      // Sucesso: remove da fila
      try {
        const remaining = readPendingQueue().filter(p => p.id !== comp.id);
        localStorage.setItem("pendingClCompletions", JSON.stringify(remaining));
      } catch { }
    } catch (err) {
      throw err;
    }
  };

  // Production
  const addProdItem = async (data) => {
    const item = { id: uid(), name: data.name, unit: data.unit || "und", minQty: Number(data.minQty) || 0, sortOrder: prodItems.length };
    setProdItems(prev => [...prev, { ...item, qty: null, cycleKey: null }]);
    await api("/api/production/items", { method: "POST", body: JSON.stringify(item) });
  };
  const updateProdItem = async (id, patch) => {
    setProdItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
    await api(`/api/production/items/${id}`, { method: "PUT", body: JSON.stringify(patch) });
  };
  const removeProdItem = async (id) => {
    setProdItems(prev => prev.filter(i => i.id !== id));
    await api(`/api/production/items/${id}`, { method: "DELETE" });
  };
  const updateProdCycle = async (patch) => {
    const next = { ...prodCycle, ...patch };
    setProdCycle(next);
    await api("/api/production/cycle", { method: "PUT", body: JSON.stringify(next) });
  };

  // Reminders
  const addReminder = (text) => {
    const t = text.trim(); if (!t) return;
    const rem = { id: uid(), text: t, authorId: currentUser.id, authorName: currentUser.name, createdAt: todayISO(), timestamp: Date.now() };
    setReminders(prev => [rem, ...prev]);
    api("/api/reminders", { method: "POST", body: JSON.stringify(rem) });
  };
  const removeReminder = (id) => { setReminders(prev => prev.filter(r => r.id !== id)); api(`/api/reminders/${id}`, { method: "DELETE" }); };

  // Invoice items (delete all)
  const clearItems = () => { setItems([]); api("/api/items", { method: "DELETE" }); };
  const removeItem = (id) => { setItems(prev => prev.filter(i => i.id !== id)); api(`/api/items/${id}`, { method: "DELETE" }); };

  // ── FILTERING (invoices) ──
  const filteredItems = items.filter(item => {
    const d = item.isoDate || item.processedAt;
    if (!isInPeriod(d, period, dateFrom, dateTo)) return false;
    if (selectedCats.length > 0 && !selectedCats.includes(item.category)) return false;
    if (searchText) { const q = searchText.toLowerCase(); if (!item.product.toLowerCase().includes(q) && !(item.supplier || "").toLowerCase().includes(q) && !(item.originalName || "").toLowerCase().includes(q)) return false; }
    return true;
  }).sort((a, b) => {
    const da = a.isoDate || a.processedAt || "";
    const db = b.isoDate || b.processedAt || "";
    if (da !== db) return db.localeCompare(da);
    return (b.processedAt || "").localeCompare(a.processedAt || "");
  });
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const catCounts = items.filter(i => isInPeriod(i.isoDate || i.processedAt, period, dateFrom, dateTo)).reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {});
  const toggleCat = c => { if (c === "__all__") return setSelectedCats([]); setSelectedCats(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]); };

  // ── INVOICE ANALYSIS ──
  const buildPrompt = () => {
    let catalogSection = "";
    if (catalog.length > 0) {
      catalogSection = `\n\nREGRA OBRIGATÓRIA DE PADRONIZAÇÃO:\nPara CADA item, verifique se corresponde a algum produto do catálogo abaixo. Use inteligência para reconhecer abreviações e variações.\nSe houver match, use o nome e categoria do catálogo. Se não, use o nome da nota.\n\nCatálogo:\n${catalog.map(p => `• "${p.name}" (${p.category})`).join("\n")}`;
    }
    return `Analise esta nota fiscal de restaurante. Extraia TODOS os itens. Retorne APENAS JSON (sem markdown):\n{"supplier":"","date":"DD/MM/AAAA","items":[{"product":"nome padronizado","originalName":"nome exato da nota","matched":bool,"quantity":num/null,"unit":"kg/un/L"/null,"unitPrice":num/null,"totalPrice":num,"category":"${CATEGORIES.join("|")}"}]}${catalogSection}\nRetorne SOMENTE o JSON.`;
  };

  const analyzeImage = async (base64, fileName) => {
    const mediaType = fileName.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    const response = await fetch("/api/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64, mediaType, prompt: buildPrompt() }),
    });
    if (!response.ok) { const errText = await response.text().catch(() => "Erro desconhecido"); throw new Error(String(errText)); }
    return await response.json();
  };

  const toBase64 = file => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); });

  const processFiles = async files => {
    const imgs = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!imgs.length) { setError("Envie imagens (JPG, PNG)."); return; }
    setProcessing(true); setError(null); setProcessedCount(0); setTotalToProcess(imgs.length);
    const today = todayISO(); const newItems = [];
    for (let i = 0; i < imgs.length; i++) {
      try {
        const b64 = await toBase64(imgs[i]); const result = await analyzeImage(b64, imgs[i].name);
        newItems.push(...result.items.map(item => ({ ...item, supplier: result.supplier || "", date: result.date || "", isoDate: toISO(result.date) || today, processedAt: today, id: uid() })));
        setProcessedCount(i + 1);
      } catch (err) { setError("Erro: " + String(err.message || err)); }
    }
    setItems(prev => [...prev, ...newItems]); setProcessing(false);
    if (newItems.length) fetch("/api/items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newItems) }).catch(() => { });
  };

  const onDrop = e => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); };
  const startEdit = item => { setEditingIdx(items.indexOf(item)); setEditForm({ ...item }); };
  const saveEdit = () => { setItems(prev => prev.map((it, i) => i === editingIdx ? { ...editForm, totalPrice: parseFloat(editForm.totalPrice) || 0, isoDate: toISO(editForm.date) || editForm.isoDate } : it)); setEditingIdx(null); };
  const deleteItem = item => { removeItem(item.id); };
  const addManualItem = () => {
    if (!manualForm.product.trim() || !manualForm.totalPrice) return;
    const newItem = { id: uid(), product: manualForm.product.trim(), originalName: "", matched: false, quantity: parseFloat(manualForm.quantity) || null, unit: manualForm.unit || null, unitPrice: null, totalPrice: parseFloat(manualForm.totalPrice) || 0, category: manualForm.category, supplier: manualForm.supplier, date: formatDateBR(manualForm.date), isoDate: manualForm.date, processedAt: todayISO() };
    setItems(p => [...p, newItem]);
    api("/api/items", { method: "POST", body: JSON.stringify([newItem]) });
    setManualForm({ product: "", totalPrice: "", quantity: "", unit: "", category: CATEGORIES[0], supplier: "", date: todayISO() });
    setShowManual(false);
  };

  const totalGeral = filteredItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
  const categoryTotals = filteredItems.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + (i.totalPrice || 0); return acc; }, {});
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  const maxCatValue = sortedCategories.length > 0 ? sortedCategories[0][1] : 1;
  const hasFilters = period !== "all" || selectedCats.length > 0 || searchText || dateFrom || dateTo;

  const mainTab = (active) => ({
    flex: "0 0 auto",
    minWidth: 96,
    padding: "12px 14px", border: "none",
    borderBottom: active ? `2px solid ${K.orange}` : "2px solid transparent",
    background: "transparent", color: active ? K.text : K.muted,
    fontSize: 13, fontWeight: active ? 700 : 500,
    cursor: "pointer", fontFamily: FONT, transition: "all 150ms ease",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
    letterSpacing: "-0.005em", whiteSpace: "nowrap",
  });
  const subTab = (active) => ({
    flexShrink: 0,
    padding: "7px 14px", borderRadius: 8, border: "1px solid",
    borderColor: active ? K.border : "transparent",
    background: active ? K.surface2 : "transparent",
    color: active ? K.text : K.text2,
    fontSize: 13, fontWeight: active ? 600 : 500,
    cursor: "pointer", fontFamily: FONT, transition: "all 150ms ease", whiteSpace: "nowrap",
  });

  return (
    <div style={{ minHeight: "100vh", background: K.ink, fontFamily: FONT, color: K.text }}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{ background: K.surface, borderBottom: `1px solid ${K.border}`, position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ padding: isMobile ? "10px 14px 0" : "16px 28px 0", maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14, marginBottom: isMobile ? 8 : 14 }}>
            <KualiMark size={isMobile ? 28 : 32} />
            <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "baseline", gap: isMobile ? 0 : 12, minWidth: 0 }}>
              <KualiLogo size={isMobile ? 18 : 22} />
              <span style={{ ...T.small, color: K.muted, fontSize: isMobile ? 11 : 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                {isMobile ? currentUser.name.split(" ")[0] : `${currentUser.name} · ${currentUser.role}${isAdmin ? " · Admin" : ""}`}
              </span>
            </div>
            <button onClick={() => setShowReminders(true)} title="Lembretes"
              style={{ position: "relative", background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 10, width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: K.text2, flexShrink: 0 }}>
              <Icon name="bell" size={18} />
              {reminders.length > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: K.orange, color: K.black, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>{reminders.length}</span>
              )}
            </button>
            {isMobile ? (
              <button onClick={() => logout()} aria-label="Sair"
                style={{ width: 40, height: 40, borderRadius: 10, background: K.surface2, border: `1px solid ${K.border}`, color: K.text2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="signout" size={18} />
              </button>
            ) : (
              <Btn kind="secondary" size="sm" icon="signout" onClick={() => logout()}>Sair</Btn>
            )}
          </div>
          {/* Tabs com scroll horizontal no mobile */}
          <div style={{ display: "flex", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", margin: isMobile ? "0 -14px" : 0, paddingLeft: isMobile ? 14 : 0, paddingRight: isMobile ? 14 : 0 }}>
            {isAdmin && <button onClick={() => setSection("compras")} style={mainTab(section === "compras")}><Icon name="receipt" size={15} color={section === "compras" ? K.orange : K.muted} /> Compras</button>}
            <button onClick={() => setSection("checklists")} style={mainTab(section === "checklists")}><Icon name="list" size={15} color={section === "checklists" ? K.orange : K.muted} /> Checklists</button>
            <button onClick={() => setSection("producao")} style={mainTab(section === "producao")}><Icon name="box" size={15} color={section === "producao" ? K.orange : K.muted} /> Produção</button>
            <button onClick={() => setSection("funcionarios")} style={mainTab(section === "funcionarios")}><Icon name="user" size={15} color={section === "funcionarios" ? K.orange : K.muted} /> Equipe</button>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION (também scroll horizontal no mobile) */}
      <div style={{ padding: isMobile ? "10px 14px" : "12px 28px", borderBottom: `1px solid ${K.border}`, display: "flex", gap: 6, alignItems: "center", maxWidth: 1400, margin: "0 auto", width: "100%", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {section === "compras" && isAdmin && (
          <>
            <button onClick={() => setComprasTab("notas")} style={subTab(comprasTab === "notas")}>Notas fiscais</button>
            <button onClick={() => setComprasTab("resumo")} style={subTab(comprasTab === "resumo")}>Resumo</button>
            <button onClick={() => setComprasTab("produtos")} style={subTab(comprasTab === "produtos")}>Produtos ({catalog.length})</button>
            {(comprasTab === "notas" || comprasTab === "resumo") && items.length > 0 && (
              <><div style={{ flex: 1 }} /><input type="text" placeholder="Buscar..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ ...inputBase, width: 180, borderRadius: 10, fontSize: 12, padding: "5px 10px" }} /></>
            )}
          </>
        )}
        {section === "funcionarios" && isAdmin && (
          <>
            <button style={subTab(true)}>Equipe ({users.length})</button>
          </>
        )}
        {section === "producao" && (
          <>
            <button onClick={() => setProducaoTab("controle")} style={subTab(producaoTab === "controle")}>Controle</button>
            {isAdmin && <button onClick={() => setProducaoTab("gerenciar")} style={subTab(producaoTab === "gerenciar")}>Gerenciar itens ({prodItems.length})</button>}
          </>
        )}
        {section === "checklists" && (
          <>
            <button onClick={() => setCheckTab("fazer")} style={subTab(checkTab === "fazer")}>Check-lists</button>
            {isAdmin && <button onClick={() => setCheckTab("analise")} style={subTab(checkTab === "analise")}>Análise</button>}
            {isAdmin && <button onClick={() => setCheckTab("criar")} style={subTab(checkTab === "criar")}>Criar ({clTemplates.length})</button>}
          </>
        )}
      </div>

      {/* TAB: COMPRAS */}
      {isAdmin && section === "compras" && comprasTab === "produtos" && <CatalogView catalog={catalog} onAdd={addCatalogItem} onUpdate={updateCatalogItem} onRemove={removeCatalogItem} />}
      {isAdmin && section === "compras" && (comprasTab === "notas" || comprasTab === "resumo") && (
        <div className="kuali-anim" style={{ maxWidth: 1400, margin: "0 auto" }}>
          {/* Page header */}
          <div style={{ padding: isMobile ? "18px 16px 14px" : "24px 28px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...T.caption, color: K.orange }}>COMPRAS</div>
              <div style={{ ...T.h1, color: K.text, marginTop: 6, fontSize: isMobile ? 22 : 28 }}>{comprasTab === "notas" ? "Notas fiscais" : "Resumo do período"}</div>
              <div style={{ ...T.body, color: K.text2, marginTop: 4, fontSize: isMobile ? 13 : 15 }}>
                {filteredItems.length} {filteredItems.length === 1 ? "item" : "itens"}
                {filteredItems.length > 0 && <> · <span style={{ ...T.mono, color: K.text }}>{formatBRL(totalGeral)}</span></>}
              </div>
            </div>
            {filteredItems.length > 0 && comprasTab === "notas" && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!isMobile && <Btn kind="secondary" icon="upload" onClick={() => downloadCSV(filteredItems)}>Exportar CSV</Btn>}
                <Btn kind="primary" size={isMobile ? "sm" : "md"} icon="upload" onClick={() => fileRef.current?.click()}>{isMobile ? "Lançar" : "Lançar nota"}</Btn>
              </div>
            )}
          </div>

          {/* Filters */}
          {items.length > 0 && (
            <div style={{ padding: isMobile ? "0 16px 12px" : "0 28px 14px" }}>
              <Card padding={16}>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                  <span style={{ ...T.caption, color: K.muted, marginRight: 6 }}>Período</span>
                  {PERIODS.map(p => {
                    const active = period === p.key;
                    return (
                      <button key={p.key} onClick={() => setPeriod(p.key)}
                        style={{
                          padding: "6px 12px", borderRadius: 9999,
                          border: `1px solid ${active ? K.orange : K.border}`,
                          background: active ? `${K.orange}1A` : "transparent",
                          color: active ? K.orange : K.text2,
                          fontSize: 12, fontFamily: FONT, fontWeight: 600,
                          cursor: "pointer", whiteSpace: "nowrap",
                        }}>{p.label}</button>
                    );
                  })}
                  {period === "custom" && (
                    <>
                      <span style={{ ...T.small, color: K.muted }}>de</span>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        style={{ background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 8, padding: "5px 10px", color: K.text, fontFamily: FONT, fontSize: 12, colorScheme: "dark" }} />
                      <span style={{ ...T.small, color: K.muted }}>até</span>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        style={{ background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 8, padding: "5px 10px", color: K.text, fontFamily: FONT, fontSize: 12, colorScheme: "dark" }} />
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ ...T.caption, color: K.muted, marginRight: 6 }}>Categorias</span>
                  <button onClick={() => toggleCat("__all__")}
                    style={{
                      padding: "6px 12px", borderRadius: 9999,
                      border: `1px solid ${selectedCats.length === 0 ? K.orange : K.border}`,
                      background: selectedCats.length === 0 ? `${K.orange}1A` : "transparent",
                      color: selectedCats.length === 0 ? K.orange : K.text2,
                      fontSize: 12, fontFamily: FONT, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    }}>Todas</button>
                  {CATEGORIES.map(c => {
                    const count = catCounts[c] || 0;
                    if (!count) return null;
                    const active = selectedCats.includes(c);
                    const color = CAT_COLOR[c];
                    return (
                      <button key={c} onClick={() => toggleCat(c)}
                        style={{
                          padding: "6px 12px", borderRadius: 9999,
                          border: `1px solid ${active ? color : K.border}`,
                          background: active ? `${color}1A` : "transparent",
                          color: active ? color : K.text2,
                          fontSize: 12, fontFamily: FONT, fontWeight: 600,
                          cursor: "pointer", whiteSpace: "nowrap",
                          display: "inline-flex", alignItems: "center", gap: 6,
                        }}>
                        <Icon name={CAT_ICON[c]} size={12} color={active ? color : K.muted} />
                        {c} <span style={{ opacity: 0.6, ...T.mono, fontSize: 11 }}>({count})</span>
                      </button>
                    );
                  })}
                  {hasFilters && (
                    <button onClick={() => { setSelectedCats([]); setPeriod("all"); setDateFrom(""); setDateTo(""); setSearchText(""); }}
                      style={{ padding: "6px 12px", borderRadius: 9999, border: `1px solid ${K.border}`, background: "transparent", color: K.muted, fontSize: 11, fontFamily: FONT, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon name="x" size={12} /> Limpar
                    </button>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Stat cards */}
          {filteredItems.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(auto-fit, minmax(220px, 1fr))", gap: isMobile ? 10 : 14, padding: isMobile ? "8px 16px 12px" : "8px 28px 14px" }}>
              {[
                { label: "TOTAL GASTO", value: formatBRL(totalGeral), mono: true },
                { label: "ITENS", value: filteredItems.length, mono: true },
                { label: "CATEGORIAS", value: Object.keys(categoryTotals).length, mono: true },
                { label: "FORNECEDORES", value: [...new Set(filteredItems.map(i => i.supplier).filter(Boolean))].length, mono: true },
              ].map(s => (
                <Card key={s.label} padding={isMobile ? 12 : 18}>
                  <div style={{ ...T.caption, color: K.muted, fontSize: isMobile ? 10 : 11 }}>{s.label}</div>
                  <div style={{ fontSize: isMobile ? 20 : 28, fontWeight: 700, color: K.text, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", marginTop: 8, fontFamily: s.mono ? MONO : FONT, wordBreak: "break-word" }}>{s.value}</div>
                </Card>
              ))}
            </div>
          )}

          <div style={{ padding: isMobile ? "0 16px 24px" : "0 28px 32px" }}>
            {/* Drop zone (Claude AI) */}
            {comprasTab === "notas" && (
              <Card padding={0} style={{ marginBottom: 16, marginTop: 4, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${K.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon name="sparkle" size={18} color={K.orange} />
                    <div>
                      <div style={{ ...T.caption, color: K.muted }}>IA · NF AUTO-IMPORT</div>
                      <div style={{ ...T.h3, color: K.text, marginTop: 2 }}>Upload com Claude</div>
                    </div>
                  </div>
                  <Chip icon="sparkle" color={K.orange} bg={`${K.orange}22`}>Beta</Chip>
                </div>
                <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onClick={() => !processing && fileRef.current?.click()}
                  style={{
                    margin: 16,
                    border: `1.5px dashed ${dragOver ? K.orange : K.borderStrong}`,
                    borderRadius: 12,
                    padding: processing ? 16 : 28,
                    textAlign: "center",
                    cursor: processing ? "default" : "pointer",
                    background: dragOver ? `${K.orange}0D` : K.surface2,
                    transition: "all 150ms ease",
                  }}>
                  <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => processFiles(e.target.files)} />
                  {processing ? (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                      <Icon name="spinner" size={18} color={K.orange} spin />
                      <span style={{ ...T.body, color: K.text, fontWeight: 600 }}>Analisando nota {processedCount + 1} de {totalToProcess}…</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ width: 52, height: 52, borderRadius: 14, background: `${K.orange}1A`, color: K.orange, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                        <Icon name="upload" size={24} />
                      </div>
                      <div style={{ ...T.bodyB, color: K.text }}>Solte a foto da NF aqui</div>
                      <div style={{ ...T.small, color: K.muted, marginTop: 4 }}>
                        Itens, fornecedor e total extraídos automaticamente{catalog.length > 0 ? ` · ${catalog.length} produtos no catálogo` : ""}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {error && (
              <div style={{ padding: "12px 14px", borderRadius: 10, background: `${K.err}1A`, border: `1px solid ${K.err}55`, color: K.err, ...T.small, fontWeight: 600, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="alert" size={16} /> {error}
              </div>
            )}

            {/* Manual entry */}
            <div style={{ marginBottom: 14 }}>
              <Btn kind={showManual ? "secondary" : "ghost"} size="sm" icon={showManual ? "x" : "plus"} onClick={() => setShowManual(!showManual)}>
                {showManual ? "Fechar" : "Adicionar nota manualmente"}
              </Btn>
              {showManual && (
                <Card padding={20} style={{ marginTop: 10 }} className="kuali-anim">
                  <div style={{ ...T.h3, color: K.text, marginBottom: 14 }}>Adicionar item manualmente</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 14 }}>
                    {[
                      { key: "product", label: "Produto *", placeholder: "Ex: Frango", colSpan: 2 },
                      { key: "totalPrice", label: "Valor total (R$) *", placeholder: "0.00", type: "number", step: "0.01" },
                      { key: "quantity", label: "Quantidade", placeholder: "1", type: "number" },
                    ].map(f => (
                      <div key={f.key} style={f.colSpan ? { gridColumn: `span ${f.colSpan}` } : undefined}>
                        <label style={{ ...T.caption, color: K.muted, display: "block", marginBottom: 6 }}>{f.label}</label>
                        <input type={f.type} step={f.step} value={manualForm[f.key]} onChange={e => setManualForm({ ...manualForm, [f.key]: e.target.value })} placeholder={f.placeholder}
                          style={{ width: "100%", background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 8, padding: "9px 12px", color: K.text, fontFamily: FONT, fontSize: 14 }} />
                      </div>
                    ))}
                    <div>
                      <label style={{ ...T.caption, color: K.muted, display: "block", marginBottom: 6 }}>Unidade</label>
                      <select value={manualForm.unit} onChange={e => setManualForm({ ...manualForm, unit: e.target.value })}
                        style={{ width: "100%", background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 8, padding: "9px 12px", color: K.text, fontFamily: FONT, fontSize: 14 }}>
                        <option value="">—</option><option>kg</option><option>un</option><option>L</option><option>cx</option><option>pc</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ ...T.caption, color: K.muted, display: "block", marginBottom: 6 }}>Categoria</label>
                      <select value={manualForm.category} onChange={e => setManualForm({ ...manualForm, category: e.target.value })}
                        style={{ width: "100%", background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 8, padding: "9px 12px", color: K.text, fontFamily: FONT, fontSize: 14 }}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ ...T.caption, color: K.muted, display: "block", marginBottom: 6 }}>Fornecedor</label>
                      <input value={manualForm.supplier} onChange={e => setManualForm({ ...manualForm, supplier: e.target.value })} placeholder="Ex: Atacadão"
                        style={{ width: "100%", background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 8, padding: "9px 12px", color: K.text, fontFamily: FONT, fontSize: 14 }} />
                    </div>
                    <div>
                      <label style={{ ...T.caption, color: K.muted, display: "block", marginBottom: 6 }}>Data</label>
                      <input type="date" value={manualForm.date} onChange={e => setManualForm({ ...manualForm, date: e.target.value })}
                        style={{ width: "100%", background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 8, padding: "9px 12px", color: K.text, fontFamily: FONT, fontSize: 14, colorScheme: "dark" }} />
                    </div>
                  </div>
                  <Btn kind="primary" icon="plus" onClick={addManualItem}>Adicionar item</Btn>
                </Card>
              )}
            </div>

            {filteredItems.length > 0 && comprasTab === "notas" && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}>
                <Btn kind="ghost" size="sm" icon="trash" onClick={() => { clearItems(); setSelectedCats([]); setPeriod("all"); setSearchText(""); }} style={{ color: K.err }}>Limpar tudo</Btn>
              </div>
            )}

            {/* Table */}
            {filteredItems.length > 0 && comprasTab === "notas" && (
              <Card padding={0} style={{ overflow: "hidden" }} className="kuali-anim">
                <div style={{ padding: "14px 20px", borderBottom: `1px solid ${K.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ ...T.h3, color: K.text }}>Últimas notas</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: K.surface2, padding: "8px 12px", borderRadius: 10, border: `1px solid ${K.border}`, minWidth: 240, maxWidth: 320, flex: 1 }}>
                    <Icon name="search" size={16} color={K.muted} />
                    <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Buscar fornecedor, produto…"
                      style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: K.text, fontFamily: FONT, fontSize: 13 }} />
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT }}>
                    <thead>
                      <tr style={{ background: K.surface2 }}>
                        {["DATA", "PRODUTO", "ORIGINAL", "QTD", "TOTAL", "CATEGORIA", "FORNECEDOR", ""].map(h => (
                          <th key={h} style={{ ...T.caption, color: K.muted, padding: "12px 12px", textAlign: h === "TOTAL" ? "right" : "left", whiteSpace: "nowrap", borderBottom: `1px solid ${K.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedItems.map((item) => {
                        const realIdx = items.indexOf(item);
                        const isEd = editingIdx === realIdx;
                        const nc = item.originalName && item.originalName.toLowerCase() !== item.product.toLowerCase();
                        const catColor = CAT_COLOR[item.category] || K.muted;
                        return (
                          <tr key={item.id}
                            style={{ borderBottom: `1px solid ${K.border}`, background: isEd ? `${K.orange}0D` : "transparent", transition: "background 100ms ease" }}
                            onMouseEnter={e => { if (!isEd) e.currentTarget.style.background = `${K.surface2}80`; }}
                            onMouseLeave={e => { if (!isEd) e.currentTarget.style.background = "transparent"; }}>
                            {isEd ? (
                              <>
                                <td style={{ padding: "8px 10px" }}><input value={editForm.date || ""} onChange={e => setEditForm({ ...editForm, date: e.target.value })} style={{ width: 100, background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 6, padding: "6px 8px", color: K.text, fontSize: 13, fontFamily: FONT }} /></td>
                                <td style={{ padding: "8px 10px" }}><input value={editForm.product} onChange={e => setEditForm({ ...editForm, product: e.target.value })} style={{ width: "100%", background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 6, padding: "6px 8px", color: K.text, fontSize: 13, fontFamily: FONT }} /></td>
                                <td style={{ padding: "8px 6px", color: K.muted, fontSize: 12 }}>{editForm.originalName || "—"}</td>
                                <td style={{ padding: "8px 6px" }}><input value={editForm.quantity || ""} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} style={{ width: 60, background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 6, padding: "6px 8px", color: K.text, fontSize: 13, fontFamily: FONT }} /></td>
                                <td style={{ padding: "8px 6px" }}><input value={editForm.totalPrice} onChange={e => setEditForm({ ...editForm, totalPrice: e.target.value })} style={{ width: 90, background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 6, padding: "6px 8px", color: K.text, fontSize: 13, fontFamily: MONO }} /></td>
                                <td style={{ padding: "8px 6px" }}>
                                  <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} style={{ background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 6, padding: "6px 8px", color: K.text, fontSize: 12, fontFamily: FONT }}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: "8px 6px" }}><input value={editForm.supplier || ""} onChange={e => setEditForm({ ...editForm, supplier: e.target.value })} style={{ width: 110, background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 6, padding: "6px 8px", color: K.text, fontSize: 13, fontFamily: FONT }} /></td>
                                <td style={{ padding: "8px 8px", whiteSpace: "nowrap", display: "flex", gap: 4 }}>
                                  <button onClick={saveEdit} title="Salvar" style={{ background: "transparent", border: "none", cursor: "pointer", color: K.green, padding: 4 }}><Icon name="check" size={18} /></button>
                                  <button onClick={() => setEditingIdx(null)} title="Cancelar" style={{ background: "transparent", border: "none", cursor: "pointer", color: K.muted, padding: 4 }}><Icon name="x" size={18} /></button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: "12px 12px", color: K.muted, fontFamily: MONO, fontSize: 12, whiteSpace: "nowrap" }}>{formatDateBR(item.isoDate)}</td>
                                <td style={{ padding: "12px 12px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ ...T.bodyB, color: K.text, fontSize: 14 }}>{item.product}</span>
                                    {item.matched && <Chip color={K.green} bg={`${K.green}1A`}>catálogo</Chip>}
                                  </div>
                                </td>
                                <td style={{ padding: "12px 12px", color: nc ? K.muted : K.borderStrong, fontSize: 12, fontStyle: nc ? "italic" : "normal" }}>{nc ? item.originalName : "—"}</td>
                                <td style={{ padding: "12px 12px", color: K.text2, fontFamily: MONO, fontSize: 13 }}>{item.quantity}{item.unit ? ` ${item.unit}` : ""}</td>
                                <td style={{ padding: "12px 12px", color: K.text, fontFamily: MONO, fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{formatBRL(item.totalPrice)}</td>
                                <td style={{ padding: "12px 12px" }}>
                                  <Chip icon={CAT_ICON[item.category]} color={catColor} bg={`${catColor}1A`}>{item.category}</Chip>
                                </td>
                                <td style={{ padding: "12px 12px", color: K.text2, fontSize: 13 }}>{item.supplier || "—"}</td>
                                <td style={{ padding: "12px 12px", whiteSpace: "nowrap" }}>
                                  <button onClick={() => startEdit(item)} title="Editar" style={{ background: "transparent", border: "none", cursor: "pointer", color: K.muted, padding: 6 }} onMouseEnter={e => e.currentTarget.style.color = K.text} onMouseLeave={e => e.currentTarget.style.color = K.muted}><Icon name="edit" size={16} /></button>
                                  <button onClick={() => deleteItem(item)} title="Apagar" style={{ background: "transparent", border: "none", cursor: "pointer", color: K.muted, padding: 6 }} onMouseEnter={e => e.currentTarget.style.color = K.err} onMouseLeave={e => e.currentTarget.style.color = K.muted}><Icon name="trash" size={16} /></button>
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop: `2px solid ${K.border}`, background: K.surface2 }}>
                        <td colSpan={4} style={{ padding: "14px 12px", ...T.caption, color: K.muted }}>Total ({filteredItems.length})</td>
                        <td style={{ padding: "14px 12px", color: K.orange, fontFamily: MONO, fontWeight: 700, fontSize: 16, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{formatBRL(totalGeral)}</td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, padding: "14px 16px", borderTop: `1px solid ${K.border}` }}>
                    <Btn kind="secondary" size="sm" icon="arrow-left" disabled={safePage === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Btn>
                    <span style={{ ...T.small, color: K.text2 }}>Página <span style={{ ...T.mono, color: K.text }}>{safePage}</span> de <span style={{ ...T.mono, color: K.text }}>{totalPages}</span></span>
                    <Btn kind="secondary" size="sm" iconRight="arrow-right" disabled={safePage === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Próxima</Btn>
                  </div>
                )}
              </Card>
            )}

            {/* Resumo */}
            {filteredItems.length > 0 && comprasTab === "resumo" && (
              <div className="kuali-anim" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 14, marginTop: 8 }}>
                <Card padding={22}>
                  <div style={{ ...T.caption, color: K.muted }}>POR CATEGORIA</div>
                  <div style={{ ...T.h3, color: K.text, marginTop: 4, marginBottom: 18 }}>Consumo do período</div>
                  {sortedCategories.map(([cat, total]) => {
                    const color = CAT_COLOR[cat] || K.muted;
                    return (
                      <div key={cat} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ ...T.small, color: K.text, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <Icon name={CAT_ICON[cat]} size={14} color={color} /> {cat}
                          </span>
                          <span style={{ ...T.mono, color: K.text2 }}>
                            {formatBRL(total)} <span style={{ color: K.muted }}>({((total / totalGeral) * 100).toFixed(1)}%)</span>
                          </span>
                        </div>
                        <div style={{ height: 6, background: K.surface2, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${(total / maxCatValue) * 100}%`, background: color, borderRadius: 4 }} />
                        </div>
                      </div>
                    );
                  })}
                </Card>
                <Card padding={22}>
                  <div style={{ ...T.caption, color: K.muted }}>RANKING</div>
                  <div style={{ ...T.h3, color: K.text, marginTop: 4, marginBottom: 14 }}>Top 10 maiores gastos</div>
                  {[...filteredItems].sort((a, b) => b.totalPrice - a.totalPrice).slice(0, 10).map((item, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 9 ? `1px solid ${K.border}` : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 8, background: i < 3 ? `${K.orange}1A` : K.surface2, display: "flex", alignItems: "center", justifyContent: "center", color: i < 3 ? K.orange : K.muted, fontWeight: 800, ...T.small, fontFamily: MONO }}>{i + 1}</span>
                        <span style={{ ...T.body, color: K.text }}>{item.product}</span>
                      </div>
                      <span style={{ ...T.mono, color: K.text, fontWeight: 700, fontSize: 14 }}>{formatBRL(item.totalPrice)}</span>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {items.length === 0 && !processing && comprasTab === "notas" && (
              <Card padding={48} style={{ textAlign: "center", marginTop: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: K.surface2, color: K.muted, display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Icon name="receipt" size={28} />
                </div>
                <div style={{ ...T.bodyB, color: K.text }}>Nenhuma nota fiscal lançada</div>
                <div style={{ ...T.small, color: K.muted, marginTop: 4 }}>Solte uma foto acima para a IA extrair os itens automaticamente</div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB: PRODUÇÃO */}
      {section === "producao" && producaoTab === "controle" && <ProductionControlView items={prodItems} cycle={prodCycle} onUpdateItem={updateProdItem} onUpdateCycle={updateProdCycle} />}
      {section === "producao" && producaoTab === "gerenciar" && isAdmin && <ProductionManageView items={prodItems} onAdd={addProdItem} onUpdate={updateProdItem} onRemove={removeProdItem} />}
      {section === "producao" && producaoTab === "gerenciar" && !isAdmin && <RestrictedArea />}

      {/* TAB: FUNCIONÁRIOS */}
      {section === "funcionarios" && isAdmin && <EmployeeManager users={users} onAdd={addUser} onUpdate={updateUser} onRemove={removeUser} />}
      {section === "funcionarios" && !isAdmin && <RestrictedArea />}

      {/* TAB: CHECKLISTS */}
      {section === "checklists" && checkTab === "fazer" && <ChecklistDo templates={clTemplates} completions={clCompletions} onComplete={addClCompletion} currentUser={currentUser} onPhotoClick={setLightboxSrc} />}
      {section === "checklists" && isAdmin && checkTab === "analise" && <ChecklistAnalysis completions={clCompletions} users={users} onPhotoClick={setLightboxSrc} />}
      {section === "checklists" && isAdmin && checkTab === "criar" && <ChecklistCreate templates={clTemplates} onAdd={addClTemplate} onUpdate={updateClTemplate} onRemove={removeClTemplate} />}
      {section === "checklists" && !isAdmin && checkTab !== "fazer" && <RestrictedArea />}

      {!isAdmin && section === "compras" && <RestrictedArea />}

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      {showReminders && <RemindersModal reminders={reminders} currentUser={currentUser} onAdd={addReminder} onRemove={removeReminder} onClose={() => setShowReminders(false)} />}
    </div>
  );
}
