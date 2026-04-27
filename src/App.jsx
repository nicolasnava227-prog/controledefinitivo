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

function RemindersModal({ reminders, currentUser, onAdd, onRemove, onClose }) {
  const [text, setText] = useState("");
  const submit = () => { if (!text.trim()) return; onAdd(text); setText(""); };
  const fmtTime = ts => { const d = new Date(ts); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0c0c14", borderRadius: 16, border: "1px solid #1e1e2e", padding: "24px 24px 20px", width: "100%", maxWidth: 480, maxHeight: "85vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔔</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Lembretes</div>
              <div style={{ fontSize: 10, color: "#4a4a5a", letterSpacing: 1.5, textTransform: "uppercase" }}>{reminders.length} {reminders.length === 1 ? "aviso ativo" : "avisos ativos"}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", opacity: 0.6 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Ex: Fazer frango amanhã cedo..."
            onKeyDown={e => e.key === "Enter" && submit()}
            style={{ ...inputBase, flex: 1, borderRadius: 8 }} />
          <button onClick={submit} style={{ ...actionBtn("#6ee7b7"), fontWeight: 600 }}>+ Adicionar</button>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {reminders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "28px 10px", color: "#3a3a4a", fontSize: 13 }}>Nenhum lembrete ativo.</div>
          ) : reminders.map(r => {
            const mine = r.authorId === currentUser.id;
            return (
              <div key={r.id} style={{ padding: "12px 14px", background: "#08080c", borderRadius: 10, border: "1px solid #13131e", marginBottom: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 14, marginTop: 1 }}>📌</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "#ddd", wordBreak: "break-word", marginBottom: 4 }}>{r.text}</div>
                  <div style={{ fontSize: 10, color: "#4a4a5a" }}>{r.authorName}{mine ? " (você)" : ""} · {fmtTime(r.timestamp)}</div>
                </div>
                <button onClick={() => onRemove(r.id)} title="Remover" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.35 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.35}>🗑️</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }
  @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin { to { transform:rotate(360deg); } }
  .anim { animation: slideUp 0.3s ease-out forwards; }
  input:focus, select:focus { outline: 1px solid #34d39955; outline-offset: -1px; }
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
  const [form, setForm] = useState({ name: "", username: "", password: "", role: ROLES[0], isAdmin: false });
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
    setForm({ name: "", username: "", password: "", role: ROLES[0], isAdmin: false });
  };

  const startEdit = (u) => { setEditId(u.id); setForm({ name: u.name, username: u.username, password: u.password, role: u.role, isAdmin: u.isAdmin }); };
  const remove = (id) => { if (id === "admin") return alert("Não pode remover o admin principal"); onRemove(id); };

  return (
    <div style={{ padding: "20px 28px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ ...cardStyle, marginBottom: 20, padding: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>
          {editId ? "Editar funcionário" : "Adicionar funcionário"}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 150px" }}>
            <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Nome completo</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Maria Silva" style={{ ...inputBase, width: "100%" }} />
          </div>
          <div style={{ flex: "0 0 130px" }}>
            <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Usuário (login)</label>
            <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="maria" style={{ ...inputBase, width: "100%" }} />
          </div>
          <div style={{ flex: "0 0 120px" }}>
            <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Senha</label>
            <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="1234" style={{ ...inputBase, width: "100%" }} />
          </div>
          <div style={{ flex: "0 0 160px" }}>
            <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Função</label>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ ...inputBase, width: "100%" }}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "#888", padding: "8px 0" }}>
            <input type="checkbox" checked={form.isAdmin} onChange={e => setForm({ ...form, isAdmin: e.target.checked })} /> Admin
          </label>
          <button onClick={save} style={{ ...actionBtn("#6ee7b7"), fontWeight: 600, padding: "8px 20px" }}>{editId ? "Salvar" : "+ Adicionar"}</button>
          {editId && <button onClick={() => { setEditId(null); setForm({ name: "", username: "", password: "", role: ROLES[0], isAdmin: false }); }} style={actionBtn("#888")}>Cancelar</button>}
        </div>
      </div>

      {users.map(u => (
        <div key={u.id} style={{ ...cardStyle, marginBottom: 8, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: u.isAdmin ? "#34d39920" : "#38bdf820", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: u.isAdmin ? "#6ee7b7" : "#38bdf8" }}>
            {u.name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#ddd", display: "flex", alignItems: "center", gap: 8 }}>
              {u.name}
              {u.isAdmin && <span style={{ fontSize: 9, padding: "2px 7px", borderRadius: 8, background: "#34d39918", color: "#6ee7b7", border: "1px solid #34d39930" }}>admin</span>}
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>@{u.username} · {u.role}</div>
          </div>
          <button onClick={() => startEdit(u)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.4 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.4}>✏️</button>
          {u.id !== "admin" && <button onClick={() => remove(u.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.4 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.4}>🗑️</button>}
        </div>
      ))}
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

  return (
    <div style={{ padding: "20px 28px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ ...cardStyle, padding: "16px 20px", marginBottom: 16, borderLeftWidth: 3, borderLeftColor: "#34d399" }}>
        <div style={{ fontSize: 13, color: "#6ee7b7", fontWeight: 600, marginBottom: 6 }}>Como funciona a padronização?</div>
        <p style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>
          Cadastre o nome padrão (ex: <span style={{ color: "#ddd" }}>"Frango"</span>). A IA reconhece automaticamente variações como <span style={{ color: "#777", fontStyle: "italic" }}>"FGO INTEIRO", "FRANGO CONG"</span> e registra como <span style={{ color: "#6ee7b7" }}>"Frango"</span>.
        </p>
      </div>
      <div style={{ ...cardStyle, padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 260px" }}>
            <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Nome padrão do produto</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Frango, Arroz..." style={{ ...inputBase, width: "100%" }} onKeyDown={e => e.key === "Enter" && addOrUpdate()} />
          </div>
          <div style={{ flex: "0 0 200px" }}>
            <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Categoria</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...inputBase, width: "100%" }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button onClick={addOrUpdate} style={{ ...actionBtn("#6ee7b7"), fontWeight: 600 }}>{editId ? "Salvar" : "+ Adicionar"}</button>
          {editId && <button onClick={() => { setEditId(null); setForm({ name: "", category: CATEGORIES[0] }); }} style={actionBtn("#888")}>Cancelar</button>}
        </div>
      </div>
      {catalog.length > 0 && <input placeholder="Buscar no catálogo..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputBase, width: "100%", marginBottom: 14, borderRadius: 10 }} />}
      {catalog.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#444" }}>Nenhum produto cadastrado</div>}
      {grouped.map(({ cat, items }) => (
        <div key={cat} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name={CAT_ICON[cat]} size={14} color={CAT_COLOR[cat]} />
            <span style={{ fontSize: 12, fontWeight: 600, color: CAT_COLOR[cat], textTransform: "uppercase", letterSpacing: 1.5 }}>{cat}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {items.map(p => (
              <div key={p.id} style={{ ...cardStyle, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: "#ddd" }}>{p.name}</span>
                <button onClick={() => { setEditId(p.id); setForm({ name: p.name, category: p.category }); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, opacity: 0.35 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.35}>✏️</button>
                <button onClick={() => onRemove(p.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, opacity: 0.35 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.35}>🗑️</button>
              </div>
            ))}
          </div>
        </div>
      ))}
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

  return (
    <div style={{ padding: "20px 28px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ ...cardStyle, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>
          {editId ? "Editar checklist" : "Criar novo checklist"}
        </div>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 250px" }}>
            <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Nome do checklist</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Abertura do restaurante" style={{ ...inputBase, width: "100%" }} />
          </div>
          <div style={{ flex: "0 0 180px" }}>
            <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Categoria</label>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ ...inputBase, width: "100%" }}>
              {CL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>Itens do checklist</div>
        {form.items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <button onClick={() => moveItem(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", fontSize: 10, opacity: i === 0 ? 0.15 : 0.5, color: "#fff", padding: 0, lineHeight: 1 }} onMouseEnter={e => { if (i > 0) e.target.style.opacity = 1; }} onMouseLeave={e => { if (i > 0) e.target.style.opacity = 0.5; }}>▲</button>
              <button onClick={() => moveItem(i, 1)} disabled={i === form.items.length - 1} style={{ background: "none", border: "none", cursor: i === form.items.length - 1 ? "default" : "pointer", fontSize: 10, opacity: i === form.items.length - 1 ? 0.15 : 0.5, color: "#fff", padding: 0, lineHeight: 1 }} onMouseEnter={e => { if (i < form.items.length - 1) e.target.style.opacity = 1; }} onMouseLeave={e => { if (i < form.items.length - 1) e.target.style.opacity = 0.5; }}>▼</button>
            </div>
            <span style={{ color: "#333", fontSize: 12, minWidth: 20 }}>{i + 1}.</span>
            <input value={item.text} onChange={e => updateItem(i, "text", e.target.value)} placeholder="Descreva a tarefa..."
              style={{ ...inputBase, flex: 1 }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} />
            <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: 11, color: item.requiresPhoto ? "#fbbf24" : "#444", whiteSpace: "nowrap", padding: "4px 8px", borderRadius: 6, background: item.requiresPhoto ? "#fbbf2412" : "transparent", border: `1px solid ${item.requiresPhoto ? "#fbbf2430" : "#1e1e2e"}` }}>
              <input type="checkbox" checked={item.requiresPhoto} onChange={e => updateItem(i, "requiresPhoto", e.target.checked)} style={{ accentColor: "#fbbf24" }} />
              📷 Foto
            </label>
            {form.items.length > 1 && (
              <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: 0.4, color: "#fff" }}
                onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.4}>✕</button>
            )}
          </div>
        ))}
        <button onClick={addItem} style={{ ...actionBtn("#888"), fontSize: 11, marginTop: 4, marginBottom: 16 }}>+ Adicionar item</button>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} style={{ ...actionBtn("#6ee7b7"), fontWeight: 600 }}>{editId ? "Salvar alterações" : "Criar checklist"}</button>
          {editId && <button onClick={() => { setEditId(null); setForm(empty); }} style={actionBtn("#888")}>Cancelar</button>}
        </div>
      </div>

      {/* Existing templates */}
      {templates.length > 0 && <div style={{ fontSize: 11, fontWeight: 600, color: "#444", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Checklists criados ({templates.length})</div>}
      {templates.map(t => (
        <div key={t.id} style={{ ...cardStyle, marginBottom: 10, padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#ddd" }}>{t.title}</span>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, background: (CL_CAT_COLORS[t.category] || "#666") + "18", color: CL_CAT_COLORS[t.category] || "#888", border: `1px solid ${(CL_CAT_COLORS[t.category] || "#666")}30` }}>{t.category}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => startEdit(t)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, opacity: 0.4 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.4}>✏️</button>
              <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, opacity: 0.4 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.4}>🗑️</button>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {t.items.map((item, i) => (
              <div key={i} style={{ fontSize: 12, color: "#888", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#333" }}>☐</span> {item.text}
                {item.requiresPhoto && <span style={{ fontSize: 10, color: "#fbbf24" }}>📷</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKLIST: DO (execute checklists)
// ═══════════════════════════════════════════════════════════════════════════

function ChecklistDo({ templates, completions, onComplete, currentUser, onPhotoClick }) {
  const [activeId, setActiveId] = useState(null);
  const [checked, setChecked] = useState({});
  const [photos, setPhotos] = useState({});
  const [saving, setSaving] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState(0);

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

  // A checklist is "done today" if completed today by ANY user
  const doneToday = (tplId) => completions.some(c => c.templateId === tplId && c.date === today);
  // Get who completed it today
  const doneTodayBy = (tplId) => {
    const c = completions.find(c => c.templateId === tplId && c.date === today);
    return c ? c.userName : null;
  };

  const startChecklist = (tpl) => {
    setActiveId(tpl.id);
    setChecked({});
    setPhotos({});
  };

  const compressImage = (file, maxW = 1024, quality = 0.65) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handlePhoto = (itemIdx) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "environment";
    input.onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      try {
        const dataUrl = await compressImage(file);
        setPhotos(prev => ({ ...prev, [itemIdx]: [...(prev[itemIdx] || []), dataUrl] }));
      } catch {
        alert("Erro ao processar a foto. Tente outra.");
      }
    };
    input.click();
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
    if (!photosOk) return alert("Tire foto dos itens obrigatórios (📷).");

    const comp = {
      id: uid(), templateId: tpl.id, templateTitle: tpl.title, category: tpl.category,
      userId: currentUser.id, userName: currentUser.name,
      date: today, time: nowTime(), timestamp: Date.now(),
      items: tpl.items.map((item, i) => ({ text: item.text, photos: photos[i] || [] })),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    };

    setSaving(true);
    try {
      await onComplete(comp);
      setActiveId(null); setChecked({}); setPhotos({});
    } catch {
      // Já foi salvo no localStorage pelo addClCompletion — vai retransmitir sozinho.
      alert("✅ Checklist salvo no aparelho.\n\nA conexão falhou agora, mas o app vai enviar automaticamente em segundo plano. Pode continuar usando normalmente.");
      setActiveId(null); setChecked({}); setPhotos({});
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Chip icon={catIcon} color={catColor} bg={`${catColor}22`}>{activeTpl.category}</Chip>
            <span style={{ ...T.small, color: K.muted }}>{currentUser.name} · {today}</span>
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
                          <button onClick={() => handlePhoto(i)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: K.green, ...T.small, fontWeight: 700, cursor: "pointer", padding: 0 }}>
                            <Icon name="check-circle" size={14} /> Foto enviada · adicionar mais
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handlePhoto(i)} style={{
                          height: 44, padding: "0 16px",
                          background: K.surface2,
                          border: `1px dashed ${K.borderStrong}`,
                          borderRadius: 10,
                          color: K.text,
                          display: "inline-flex", alignItems: "center", gap: 8,
                          fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: "pointer",
                        }}>
                          <Icon name="camera" size={18} color={K.orange} /> Tirar foto obrigatória
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

  return (
    <div className="anim" style={{ padding: "20px 28px", maxWidth: 900, margin: "0 auto" }}>
      {/* Info banner */}
      <div style={{ ...cardStyle, padding: "12px 18px", marginBottom: 16, borderLeftWidth: 3, borderLeftColor: "#fbbf24", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 16 }}>⏳</span>
        <span style={{ fontSize: 12, color: "#888" }}>Os checklists ficam disponíveis para revisão por <span style={{ color: "#fbbf24", fontWeight: 600 }}>7 dias</span>. Após esse prazo, saem da visualização (dados mantidos).</span>
        {expired.length > 0 && <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>{expired.length} expirados</span>}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Data</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ ...inputBase, colorScheme: "dark" }} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Funcionário</label>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={inputBase}>
            <option value="all">Todos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Categoria</label>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={inputBase}>
            <option value="all">Todas</option>
            {CL_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {filterDate && <button onClick={() => setFilterDate("")} style={{ ...actionBtn("#888"), fontSize: 11, padding: "6px 12px" }}>Limpar data</button>}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Checklists (7 dias)", value: totalThisWeek, color: "#6ee7b7" },
          { label: "Dias com registros", value: uniqueDays, color: "#38bdf8" },
          { label: "Funcionários ativos", value: uniqueUsers, color: "#c084fc" },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ fontSize: 10, color: "#4a4a5a", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* By category mini-chart */}
      {Object.keys(byCat).length > 0 && (
        <div style={{ ...cardStyle, padding: 18, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: 2, marginBottom: 12 }}>Por categoria</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, count]) => (
              <span key={cat} style={{ padding: "5px 12px", borderRadius: 10, fontSize: 12, background: (CL_CAT_COLORS[cat] || "#666") + "15", color: CL_CAT_COLORS[cat] || "#888", border: `1px solid ${(CL_CAT_COLORS[cat] || "#666")}25` }}>
                {cat}: {count}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Completion list */}
      {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#333" }}>Nenhum checklist no período selecionado</div>}
      {filtered.map(c => (
        <div key={c.id} style={{ ...cardStyle, marginBottom: 10, padding: "16px 18px" }}>
          <div onClick={() => toggleExpand(c)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 15 }}>✅</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ddd" }}>{c.templateTitle}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{c.userName} · {formatDateBR(c.date)} às {c.time}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, background: (CL_CAT_COLORS[c.category] || "#666") + "18", color: CL_CAT_COLORS[c.category] || "#888" }}>{c.category}</span>
              <span style={{ fontSize: 14, color: "#555", transform: expandedId === c.id ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▾</span>
            </div>
          </div>
          {expandedId === c.id && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #13131e" }}>
              {loadingId === c.id && !detailCache[c.id] && (
                <div style={{ fontSize: 12, color: "#555", padding: "4px 0" }}>Carregando detalhes...</div>
              )}
              {(detailCache[c.id] || []).map((item, i) => {
                const photos = item.photos || (item.photo ? [item.photo] : []);
                return (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 13, color: "#aaa", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "#34d399" }}>✓</span> {item.text}
                    </div>
                    {photos.length > 0 && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, marginLeft: 20 }}>
                        {photos.map((photo, pi) => (
                          <img key={pi} src={photo} onClick={() => onPhotoClick(photo)} style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #1e1e2e", cursor: "pointer", transition: "opacity 0.15s" }} title="Clique para ampliar"
                            onMouseEnter={e => e.target.style.opacity = 0.8} onMouseLeave={e => e.target.style.opacity = 1} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div style={{ fontSize: 10, color: "#333", marginTop: 8 }}>Expira em {formatDateBR(c.expiresAt)}</div>
            </div>
          )}
        </div>
      ))}
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
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.2 }}>🏭</div>
        <p style={{ fontSize: 14, color: "#555" }}>Nenhum item de produção cadastrado ainda.</p>
        <p style={{ fontSize: 12, color: "#444", marginTop: 6 }}>Um administrador precisa adicionar itens em "Gerenciar itens".</p>
      </div>
    );
  }

  return (
    <div className="anim" style={{ padding: "20px 28px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ ...cardStyle, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12, borderLeft: `3px solid ${locked ? "#6ee7b7" : "#fbbf24"}` }}>
        <span style={{ fontSize: 18 }}>{locked ? "🔒" : "📝"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "#ddd", fontWeight: 600 }}>
            {locked ? "Ciclo concluído" : "Ciclo aberto para edição"}
          </div>
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
            {locked
              ? `Reabre em ${formatCountdown(nextCycleStart - now)} · próximo ciclo às 21h`
              : `Registre as quantidades produzidas e clique em "Concluir"`}
          </div>
        </div>
        {locked && (
          <button onClick={reabrir} style={{ ...actionBtn("#888"), fontSize: 11, padding: "6px 12px" }}>Reabrir</button>
        )}
      </div>

      {belowMin.length > 0 && !locked && (
        <div style={{ ...cardStyle, padding: "10px 14px", marginBottom: 14, borderLeft: "3px solid #ef4444", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontSize: 12, color: "#f87171" }}>{belowMin.length} {belowMin.length === 1 ? "item abaixo" : "itens abaixo"} da quantidade mínima</span>
        </div>
      )}

      {sorted.map(item => {
        const q = visibleQty(item);
        const filled = q != null;
        const alert = filled && q < (item.minQty || 0);
        return (
          <div key={item.id} style={{ ...cardStyle, marginBottom: 8, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, borderLeft: alert ? "3px solid #ef4444" : "3px solid transparent" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#ddd" }}>{item.name}</div>
              <div style={{ fontSize: 11, color: alert ? "#f87171" : "#555", marginTop: 2 }}>
                {alert ? `⚠️ Abaixo do mínimo (${item.minQty} ${item.unit})` : `Mínimo: ${item.minQty || 0} ${item.unit}`}
              </div>
            </div>
            {locked ? (
              <div style={{ fontSize: 16, fontWeight: 700, color: alert ? "#f87171" : "#6ee7b7", minWidth: 90, textAlign: "right" }}>
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
                  style={{ ...inputBase, width: 90, textAlign: "right", fontSize: 15, fontWeight: 600 }}
                />
                <div style={{ fontSize: 12, color: "#666", minWidth: 34 }}>{item.unit}</div>
              </>
            )}
          </div>
        );
      })}

      {!locked && (
        <button
          onClick={concluir}
          disabled={!allFilled}
          style={{
            width: "100%", marginTop: 16, padding: "12px 20px", borderRadius: 10,
            border: "1px solid " + (allFilled ? "#6ee7b7" : "#2a2a3a"),
            background: allFilled ? "#34d39918" : "#13131e",
            color: allFilled ? "#6ee7b7" : "#555",
            fontSize: 14, fontWeight: 600, cursor: allFilled ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
        >
          ✓ Concluir ciclo de hoje
        </button>
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

  return (
    <div className="anim" style={{ padding: "20px 28px", maxWidth: 720, margin: "0 auto" }}>
      <div style={{ ...cardStyle, marginBottom: 20, padding: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textTransform: "uppercase", letterSpacing: 2, marginBottom: 14 }}>Adicionar item de produção</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 200px" }}>
            <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Nome</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Mix de vegetais" style={{ ...inputBase, width: "100%" }} />
          </div>
          <div style={{ flex: "0 0 90px" }}>
            <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Unidade</label>
            <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="und" style={{ ...inputBase, width: "100%" }} />
          </div>
          <div style={{ flex: "0 0 110px" }}>
            <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Qtd. mínima</label>
            <input type="number" value={form.minQty} onChange={e => setForm({ ...form, minQty: e.target.value })} placeholder="0" style={{ ...inputBase, width: "100%" }} />
          </div>
          <button onClick={save} style={{ ...actionBtn("#6ee7b7"), fontWeight: 600, padding: "8px 20px" }}>+ Adicionar</button>
        </div>
      </div>

      {sorted.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.2 }}>📋</div>
          <p style={{ fontSize: 13, color: "#555" }}>Nenhum item cadastrado</p>
        </div>
      )}

      {sorted.map(i => (
        <div key={i.id} style={{ ...cardStyle, marginBottom: 8, padding: "12px 16px" }}>
          {editId === i.id ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ ...inputBase, flex: "1 1 180px" }} />
              <input value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })} style={{ ...inputBase, width: 70 }} />
              <input type="number" value={editForm.minQty} onChange={e => setEditForm({ ...editForm, minQty: e.target.value })} style={{ ...inputBase, width: 90 }} />
              <button onClick={saveEdit} style={{ ...actionBtn("#6ee7b7"), fontSize: 11, padding: "6px 12px" }}>Salvar</button>
              <button onClick={() => setEditId(null)} style={{ ...actionBtn("#888"), fontSize: 11, padding: "6px 12px" }}>Cancelar</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#ddd" }}>{i.name}</div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Mínimo: {i.minQty || 0} {i.unit}</div>
              </div>
              <button onClick={() => startEdit(i)} style={{ ...actionBtn("#38bdf8"), fontSize: 11, padding: "6px 12px" }}>Editar</button>
              <button onClick={() => remove(i.id)} style={{ ...actionBtn("#ef4444"), fontSize: 11, padding: "6px 12px" }}>Remover</button>
            </div>
          )}
        </div>
      ))}
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
    }).catch(err => console.error("Erro ao carregar dados:", err));
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

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(refreshChecklists, 30000);
    return () => clearInterval(interval);
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
    const t = setInterval(refreshProduction, 15000);
    return () => clearInterval(t);
  }, [currentUser, section, refreshProduction]);

  // ── LOGIN ──
  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  const isAdmin = currentUser.isAdmin;

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
    flex: 1, padding: "14px 0", border: "none",
    borderBottom: active ? `2px solid ${K.orange}` : "2px solid transparent",
    background: "transparent", color: active ? K.text : K.muted,
    fontSize: 14, fontWeight: active ? 700 : 500,
    cursor: "pointer", fontFamily: FONT, transition: "all 150ms ease",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    letterSpacing: "-0.005em",
  });
  const subTab = (active) => ({
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
      <div style={{ background: K.surface, borderBottom: `1px solid ${K.border}` }}>
        <div style={{ padding: "16px 28px 0", maxWidth: 1400, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <KualiMark size={32} />
            <div style={{ flex: 1, display: "flex", alignItems: "baseline", gap: 12 }}>
              <KualiLogo size={22} />
              <span style={{ ...T.small, color: K.muted }}>{currentUser.name} · {currentUser.role}{isAdmin ? " · Admin" : ""}</span>
            </div>
            <button onClick={() => setShowReminders(true)} title="Lembretes"
              style={{ position: "relative", background: K.surface2, border: `1px solid ${K.border}`, borderRadius: 10, width: 40, height: 40, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: K.text2 }}>
              <Icon name="bell" size={18} />
              {reminders.length > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: K.orange, color: K.black, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}>{reminders.length}</span>
              )}
            </button>
            <Btn kind="secondary" size="sm" icon="signout" onClick={() => setCurrentUser(null)}>Sair</Btn>
          </div>
          <div style={{ display: "flex" }}>
            {isAdmin && <button onClick={() => setSection("compras")} style={mainTab(section === "compras")}><Icon name="receipt" size={16} color={section === "compras" ? K.orange : K.muted} /> Compras</button>}
            <button onClick={() => setSection("checklists")} style={mainTab(section === "checklists")}><Icon name="list" size={16} color={section === "checklists" ? K.orange : K.muted} /> Check-Lists</button>
            <button onClick={() => setSection("producao")} style={mainTab(section === "producao")}><Icon name="box" size={16} color={section === "producao" ? K.orange : K.muted} /> Produção</button>
            <button onClick={() => setSection("funcionarios")} style={mainTab(section === "funcionarios")}><Icon name="user" size={16} color={section === "funcionarios" ? K.orange : K.muted} /> Funcionários</button>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION */}
      <div style={{ padding: "12px 28px", borderBottom: `1px solid ${K.border}`, display: "flex", gap: 6, alignItems: "center", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
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
          <div style={{ padding: "24px 28px 20px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ ...T.caption, color: K.orange }}>COMPRAS</div>
              <div style={{ ...T.h1, color: K.text, marginTop: 6, fontSize: 28 }}>{comprasTab === "notas" ? "Notas fiscais" : "Resumo do período"}</div>
              <div style={{ ...T.body, color: K.text2, marginTop: 4 }}>
                {filteredItems.length} {filteredItems.length === 1 ? "item" : "itens"}
                {filteredItems.length > 0 && <> · <span style={{ ...T.mono, color: K.text }}>{formatBRL(totalGeral)}</span></>}
              </div>
            </div>
            {filteredItems.length > 0 && comprasTab === "notas" && (
              <div style={{ display: "flex", gap: 10 }}>
                <Btn kind="secondary" icon="upload" onClick={() => downloadCSV(filteredItems)}>Exportar CSV</Btn>
                <Btn kind="primary" icon="upload" onClick={() => fileRef.current?.click()}>Lançar nota</Btn>
              </div>
            )}
          </div>

          {/* Filters */}
          {items.length > 0 && (
            <div style={{ padding: "0 28px 14px" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, padding: "8px 28px 14px" }}>
              {[
                { label: "TOTAL GASTO", value: formatBRL(totalGeral), mono: true },
                { label: "ITENS", value: filteredItems.length, mono: true },
                { label: "CATEGORIAS", value: Object.keys(categoryTotals).length, mono: true },
                { label: "FORNECEDORES", value: [...new Set(filteredItems.map(i => i.supplier).filter(Boolean))].length, mono: true },
              ].map(s => (
                <Card key={s.label} padding={18}>
                  <div style={{ ...T.caption, color: K.muted }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: K.text, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", marginTop: 8, fontFamily: s.mono ? MONO : FONT }}>{s.value}</div>
                </Card>
              ))}
            </div>
          )}

          <div style={{ padding: "0 28px 32px" }}>
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
      {section === "producao" && producaoTab === "gerenciar" && !isAdmin && (<div style={{ textAlign: "center", padding: "60px 20px" }}><div style={{ fontSize: 44, marginBottom: 12, opacity: 0.2 }}>🔒</div><p style={{ fontSize: 14, color: "#555" }}>Área restrita para administradores</p></div>)}

      {/* TAB: FUNCIONÁRIOS */}
      {section === "funcionarios" && isAdmin && <EmployeeManager users={users} onAdd={addUser} onUpdate={updateUser} onRemove={removeUser} />}
      {section === "funcionarios" && !isAdmin && (<div style={{ textAlign: "center", padding: "60px 20px" }}><div style={{ fontSize: 44, marginBottom: 12, opacity: 0.2 }}>🔒</div><p style={{ fontSize: 14, color: "#555" }}>Área restrita para administradores</p></div>)}

      {/* TAB: CHECKLISTS */}
      {section === "checklists" && checkTab === "fazer" && <ChecklistDo templates={clTemplates} completions={clCompletions} onComplete={addClCompletion} currentUser={currentUser} onPhotoClick={setLightboxSrc} />}
      {section === "checklists" && isAdmin && checkTab === "analise" && <ChecklistAnalysis completions={clCompletions} users={users} onPhotoClick={setLightboxSrc} />}
      {section === "checklists" && isAdmin && checkTab === "criar" && <ChecklistCreate templates={clTemplates} onAdd={addClTemplate} onUpdate={updateClTemplate} onRemove={removeClTemplate} />}
      {section === "checklists" && !isAdmin && checkTab !== "fazer" && (<div style={{ textAlign: "center", padding: "60px 20px" }}><div style={{ fontSize: 44, marginBottom: 12, opacity: 0.2 }}>🔒</div><p style={{ fontSize: 14, color: "#555" }}>Área restrita para administradores</p></div>)}

      {!isAdmin && section === "compras" && (<div style={{ textAlign: "center", padding: "60px 20px" }}><div style={{ fontSize: 44, marginBottom: 12, opacity: 0.2 }}>🔒</div><p style={{ fontSize: 14, color: "#555" }}>Área restrita para administradores</p></div>)}

      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      {showReminders && <RemindersModal reminders={reminders} currentUser={currentUser} onAdd={addReminder} onRemove={removeReminder} onClose={() => setShowReminders(false)} />}
    </div>
  );
}
