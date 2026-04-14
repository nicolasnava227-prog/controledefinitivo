import { useState, useCallback, useRef, useMemo, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORIES = [
  "Carnes & Proteínas", "Hortifruti", "Laticínios", "Bebidas",
  "Grãos & Cereais", "Temperos & Condimentos", "Óleos & Gorduras",
  "Descartáveis", "Limpeza & Higiene", "Panificação", "Congelados", "Outros",
];
const CAT_COLOR = {
  "Carnes & Proteínas": "#e74c3c", Hortifruti: "#27ae60", Laticínios: "#f1c40f",
  Bebidas: "#3498db", "Grãos & Cereais": "#e67e22", "Temperos & Condimentos": "#9b59b6",
  "Óleos & Gorduras": "#f39c12", Descartáveis: "#95a5a6", "Limpeza & Higiene": "#1abc9c",
  Panificação: "#d35400", Congelados: "#2980b9", Outros: "#7f8c8d",
};
const CAT_ICON = {
  "Carnes & Proteínas": "🥩", Hortifruti: "🥬", Laticínios: "🧀", Bebidas: "🥤",
  "Grãos & Cereais": "🌾", "Temperos & Condimentos": "🌶️", "Óleos & Gorduras": "🫒",
  Descartáveis: "📦", "Limpeza & Higiene": "🧹", Panificação: "🍞",
  Congelados: "🧊", Outros: "📋",
};
const PERIODS = [
  { key: "today", label: "Hoje" }, { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mês" }, { key: "quarter", label: "Últimos 3 meses" },
  { key: "all", label: "Tudo" }, { key: "custom", label: "Personalizado" },
];
const ROLES = ["Cozinheiro(a)", "Auxiliar de cozinha", "Garçom", "Atendente", "Caixa", "Gerente", "Limpeza", "Entregador", "Outro"];
const CL_CATS = ["Abertura", "Fechamento", "Limpeza", "Segurança alimentar", "Estoque", "Atendimento", "Outro"];
const CL_CAT_COLORS = { Abertura: "#f59e0b", Fechamento: "#8b5cf6", Limpeza: "#06b6d4", "Segurança alimentar": "#ef4444", Estoque: "#22c55e", Atendimento: "#ec4899", Outro: "#6b7280" };

const DEFAULT_ADMIN = { id: "admin", name: "Administrador", username: "admin", password: "admin", role: "Gerente", isAdmin: true };

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
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

  const handleLogin = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
      if (!r.ok) { setError("Usuário ou senha incorretos"); setLoading(false); return; }
      const user = await r.json();
      onLogin(user);
    } catch {
      if (username === "admin" && password === "admin") { onLogin(DEFAULT_ADMIN); }
      else { setError("Usuário ou senha incorretos"); }
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#08080c", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{CSS}</style>
      <div className="anim" style={{ width: 380, ...cardStyle, padding: "40px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: "linear-gradient(135deg, #6ee7b7 0%, #34d399 50%, #059669 100%)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, color: "#064e36", boxShadow: "0 0 48px #34d39925", marginBottom: 16 }}>K</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Controle Kuali</div>
          <div style={{ fontSize: 11, color: "#4a4a5a", letterSpacing: 2.5, textTransform: "uppercase", marginTop: 4 }}>Faça login para continuar</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Usuário</label>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="seu usuário"
            style={{ ...inputBase, width: "100%" }} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Senha</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="sua senha"
            style={{ ...inputBase, width: "100%" }} onKeyDown={e => e.key === "Enter" && handleLogin()} />
        </div>
        {error && <div style={{ color: "#fca5a5", fontSize: 12, marginBottom: 12, textAlign: "center" }}>{error}</div>}
        <button onClick={handleLogin} style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #34d399, #059669)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Entrar</button>
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: "#333" }}>Login padrão: admin / admin</div>
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
              {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
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
            <span style={{ fontSize: 15 }}>{CAT_ICON[cat]}</span>
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

  const handlePhoto = (itemIdx) => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = "image/*"; input.capture = "environment";
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => setPhotos(prev => ({ ...prev, [itemIdx]: [...(prev[itemIdx] || []), ev.target.result] }));
      reader.readAsDataURL(file);
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

  const submit = (tpl) => {
    const allChecked = tpl.items.every((_, i) => checked[i]);
    const photosOk = tpl.items.every((item, i) => !item.requiresPhoto || (photos[i] && photos[i].length > 0));
    if (!allChecked) return alert("Complete todos os itens antes de finalizar.");
    if (!photosOk) return alert("Tire foto dos itens obrigatórios (📷).");

    onComplete({
      id: uid(), templateId: tpl.id, templateTitle: tpl.title, category: tpl.category,
      userId: currentUser.id, userName: currentUser.name,
      date: today, time: nowTime(), timestamp: Date.now(),
      items: tpl.items.map((item, i) => ({ text: item.text, photos: photos[i] || [] })),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    setActiveId(null); setChecked({}); setPhotos({});
  };

  const activeTpl = templates.find(t => t.id === activeId);

  // Group templates by category
  const grouped = CL_CATS.reduce((acc, cat) => {
    const items = templates.filter(t => t.category === cat);
    if (items.length) acc.push({ cat, items });
    return acc;
  }, []);

  if (activeTpl) {
    return (
      <div className="anim" style={{ padding: "20px 28px", maxWidth: 600, margin: "0 auto" }}>
        <button onClick={() => setActiveId(null)} style={{ ...actionBtn("#888"), marginBottom: 16, fontSize: 11 }}>← Voltar</button>
        <div style={{ ...cardStyle, padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{activeTpl.title}</span>
            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 8, background: (CL_CAT_COLORS[activeTpl.category] || "#666") + "18", color: CL_CAT_COLORS[activeTpl.category] || "#888" }}>{activeTpl.category}</span>
          </div>
          <div style={{ fontSize: 11, color: "#555", marginBottom: 20 }}>{currentUser.name} · {today}</div>

          {activeTpl.items.map((item, i) => (
            <div key={i} style={{ padding: "14px 0", borderBottom: i < activeTpl.items.length - 1 ? "1px solid #13131e" : "none" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={!!checked[i]} onChange={e => setChecked(prev => ({ ...prev, [i]: e.target.checked }))}
                  style={{ accentColor: "#34d399", marginTop: 2, width: 18, height: 18 }} />
                <span style={{ fontSize: 14, color: checked[i] ? "#6ee7b7" : "#ccc", textDecoration: checked[i] ? "line-through" : "none", flex: 1 }}>{item.text}</span>
              </label>
              {item.requiresPhoto && (
                <div style={{ marginLeft: 30, marginTop: 8 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    {(photos[i] || []).map((photo, pi) => (
                      <div key={pi} style={{ position: "relative", display: "inline-block" }}>
                        <img src={photo} onClick={() => onPhotoClick(photo)} style={{ width: 100, height: 75, objectFit: "cover", borderRadius: 8, border: "1px solid #1e1e2e", cursor: "pointer" }} title="Clique para ampliar" />
                        <button onClick={() => removePhoto(i, pi)}
                          style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", border: "none", borderRadius: "50%", width: 18, height: 18, color: "#fff", fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handlePhoto(i)} style={{ ...actionBtn((photos[i] && photos[i].length > 0) ? "#888" : "#fbbf24"), fontSize: 11, padding: "6px 12px" }}>
                    📷 {(photos[i] && photos[i].length > 0) ? "Mais fotos" : "Tirar foto (obrigatório)"}
                  </button>
                </div>
              )}
            </div>
          ))}

          <button onClick={() => submit(activeTpl)}
            style={{ width: "100%", marginTop: 20, padding: "12px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #34d399, #059669)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Finalizar checklist
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="anim" style={{ padding: "20px 28px", maxWidth: 800, margin: "0 auto" }}>
      {templates.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 20px" }}>
          <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.2 }}>📋</div>
          <p style={{ fontSize: 14, color: "#555" }}>Nenhum checklist criado ainda</p>
          <p style={{ fontSize: 12, color: "#333", marginTop: 4 }}>Peça ao administrador para criar checklists</p>
        </div>
      )}
      {grouped.map(({ cat, items }) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: CL_CAT_COLORS[cat], textTransform: "uppercase", letterSpacing: 1.5 }}>{cat}</span>
            <span style={{ fontSize: 11, color: "#333" }}>({items.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items.map(t => {
              const done = doneToday(t.id);
              const doneBy = doneTodayBy(t.id);
              return (
                <div key={t.id} onClick={() => !done && startChecklist(t)}
                  style={{ ...cardStyle, padding: "16px 18px", cursor: done ? "default" : "pointer", opacity: done ? 0.6 : 1, transition: "all 0.2s", display: "flex", alignItems: "center", gap: 14, borderColor: done ? "#13131e" : "#13131e" }}
                  onMouseEnter={e => { if (!done) e.currentTarget.style.borderColor = "#2a2a3a"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#13131e"; }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: done ? "#34d39920" : "#ffffff08", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                    {done ? "✅" : "📋"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: done ? "#6ee7b7" : "#ddd" }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>{t.items.length} itens{t.items.some(i => i.requiresPhoto) ? " · 📷 requer fotos" : ""}</div>
                  </div>
                  {done ? (
                    <span style={{ fontSize: 11, color: "#6ee7b7", fontWeight: 500 }}>✓ {doneBy || "Feito hoje"}</span>
                  ) : (
                    <span style={{ fontSize: 11, color: "#555" }}>Pendente</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
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
          <div onClick={() => setExpandedId(expandedId === c.id ? null : c.id)} style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
              {c.items.map((item, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: "#aaa", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ color: "#34d399" }}>✓</span> {item.text}
                  </div>
                  {item.photo && (
                    <img src={item.photo} onClick={() => onPhotoClick(item.photo)} style={{ width: 140, height: 105, objectFit: "cover", borderRadius: 8, border: "1px solid #1e1e2e", marginTop: 6, marginLeft: 20, cursor: "pointer" }} title="Clique para ampliar" />
                  )}
                  {item.photos && item.photos.length > 0 && (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6, marginLeft: 20 }}>
                      {item.photos.map((photo, pi) => (
                        <img key={pi} src={photo} onClick={() => onPhotoClick(photo)} style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #1e1e2e", cursor: "pointer", transition: "opacity 0.15s" }} title="Clique para ampliar"
                          onMouseEnter={e => e.target.style.opacity = 0.8} onMouseLeave={e => e.target.style.opacity = 1} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ fontSize: 10, color: "#333", marginTop: 8 }}>Expira em {formatDateBR(c.expiresAt)}</div>
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
  const [currentUser, setCurrentUser] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Navigation
  const [section, setSection] = useState("compras");
  const [comprasTab, setComprasTab] = useState("notas");
  const [checkTab, setCheckTab] = useState("fazer");

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
  const fileRef = useRef();

  // Checklist data
  const [clTemplates, setClTemplates] = useState([]);
  const [clCompletions, setClCompletions] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ product: "", totalPrice: "", quantity: "", unit: "", category: CATEGORIES[0], supplier: "", date: todayISO() });
  const [lightboxSrc, setLightboxSrc] = useState(null);

  // handleDrop hook before early return
  const handleDrop = useCallback(e => { e.preventDefault(); setDragOver(false); }, []);

  // ── Load all data from backend ──
  useEffect(() => {
    if (!currentUser) return;
    Promise.all([
      fetch("/api/users").then(r => r.json()),
      fetch("/api/items").then(r => r.json()),
      fetch("/api/catalog").then(r => r.json()),
      fetch("/api/cl-templates").then(r => r.json()),
      fetch("/api/cl-completions").then(r => r.json()),
    ]).then(([u, i, c, t, co]) => {
      setUsers(u); setItems(i); setCatalog(c); setClTemplates(t); setClCompletions(co);
      setDataLoaded(true);
    }).catch(err => console.error("Erro ao carregar dados:", err));
  }, [currentUser]);

  // ── Sync checklist data across devices (poll every 30s) ──
  const refreshChecklists = useCallback(() => {
    Promise.all([
      fetch("/api/cl-completions").then(r => r.json()),
      fetch("/api/cl-templates").then(r => r.json()),
    ]).then(([co, t]) => {
      setClCompletions(co);
      setClTemplates(t);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(refreshChecklists, 30000);
    return () => clearInterval(interval);
  }, [currentUser, refreshChecklists]);

  // Refetch checklists whenever user navigates to the checklists section or switches sub-tabs
  useEffect(() => {
    if (currentUser && section === "checklists") refreshChecklists();
  }, [section, checkTab, currentUser, refreshChecklists]);

  // ── LOGIN ──
  if (!currentUser) return <LoginScreen onLogin={setCurrentUser} />;

  const isAdmin = currentUser.isAdmin;

  // ── API-backed data operations ──
  const api = (url, opts = {}) => fetch(url, { headers: { "Content-Type": "application/json" }, ...opts }).catch(() => { });

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

  // Checklist Completions
  const addClCompletion = (comp) => { setClCompletions(prev => [...prev, comp]); api("/api/cl-completions", { method: "POST", body: JSON.stringify(comp) }); };

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
  const startEdit = idx => { const item = filteredItems[idx]; setEditingIdx(items.indexOf(item)); setEditForm({ ...item }); };
  const saveEdit = () => { setItems(prev => prev.map((it, i) => i === editingIdx ? { ...editForm, totalPrice: parseFloat(editForm.totalPrice) || 0, isoDate: toISO(editForm.date) || editForm.isoDate } : it)); setEditingIdx(null); };
  const deleteItem = idx => { const item = filteredItems[idx]; removeItem(item.id); };
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
    flex: 1, padding: "12px 0", border: "none", borderBottom: active ? "2px solid #34d399" : "2px solid transparent",
    background: "transparent", color: active ? "#6ee7b7" : "#555", fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
  });
  const subTab = (active) => ({
    padding: "5px 14px", borderRadius: 8, border: "1px solid",
    borderColor: active ? "#ffffff18" : "transparent", background: active ? "#ffffff08" : "transparent",
    color: active ? "#ddd" : "#555", fontSize: 12, fontWeight: 500,
    cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s", whiteSpace: "nowrap",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#08080c", fontFamily: "'Inter', system-ui, sans-serif", color: "#d4d4d4" }}>
      <style>{CSS}</style>

      {/* HEADER */}
      <div style={{ background: "#0c0c14", borderBottom: "1px solid #13131e" }}>
        <div style={{ padding: "18px 28px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg, #6ee7b7 0%, #059669 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#064e36", boxShadow: "0 0 24px #34d39918" }}>K</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px" }}>Controle Kuali</div>
              <div style={{ fontSize: 10, color: "#4a4a5a", letterSpacing: 2 }}>{currentUser.name} · {currentUser.role}{isAdmin ? " · Admin" : ""}</div>
            </div>
            <button onClick={() => setCurrentUser(null)} style={{ ...actionBtn("#ef4444"), fontSize: 11, padding: "6px 14px" }}>Sair</button>
          </div>
          <div style={{ display: "flex" }}>
            {isAdmin && <button onClick={() => setSection("compras")} style={mainTab(section === "compras")}>🧾 Compras</button>}
            <button onClick={() => setSection("checklists")} style={mainTab(section === "checklists")}>📋 Check-Lists</button>
            <button onClick={() => setSection("funcionarios")} style={mainTab(section === "funcionarios")}>👥 Funcionários</button>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION */}
      <div style={{ padding: "10px 28px", borderBottom: "1px solid #13131e", display: "flex", gap: 6, alignItems: "center" }}>
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
        <>
          {items.length > 0 && (
            <div style={{ padding: "14px 28px", borderBottom: "1px solid #13131e" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#3a3a4a", marginRight: 6, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>Período</span>
                {PERIODS.map(p => (<button key={p.key} onClick={() => setPeriod(p.key)} style={pill(period === p.key, p.key === "custom" ? "#fbbf24" : "#6ee7b7")}>{p.key === "custom" ? "📅 " : ""}{p.label}</button>))}
                {period === "custom" && (<><span style={{ color: "#444", fontSize: 12 }}>de</span><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ ...inputBase, colorScheme: "dark", fontSize: 12 }} /><span style={{ color: "#444", fontSize: 12 }}>até</span><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ ...inputBase, colorScheme: "dark", fontSize: 12 }} /></>)}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ fontSize: 10, color: "#3a3a4a", marginRight: 6, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>Categorias</span>
                <button onClick={() => toggleCat("__all__")} style={pill(selectedCats.length === 0, "#6ee7b7")}>Todas</button>
                {CATEGORIES.map(c => { const count = catCounts[c] || 0; if (!count) return null; return (<button key={c} onClick={() => toggleCat(c)} style={pill(selectedCats.includes(c), CAT_COLOR[c])}><span style={{ fontSize: 13 }}>{CAT_ICON[c]}</span> {c} <span style={{ opacity: 0.55, fontSize: 10 }}>({count})</span></button>); })}
                {hasFilters && <button onClick={() => { setSelectedCats([]); setPeriod("all"); setDateFrom(""); setDateTo(""); setSearchText(""); }} style={{ ...pill(false, "#888"), color: "#666", fontSize: 11 }}>✕ Limpar</button>}
              </div>
            </div>
          )}
          {filteredItems.length > 0 && (
            <div className="anim" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, padding: "16px 28px" }}>
              {[{ label: "Total gasto", value: formatBRL(totalGeral), color: "#6ee7b7" }, { label: "Itens", value: filteredItems.length, color: "#38bdf8" }, { label: "Categorias", value: Object.keys(categoryTotals).length, color: "#c084fc" }, { label: "Fornecedores", value: [...new Set(filteredItems.map(i => i.supplier).filter(Boolean))].length, color: "#fbbf24" }].map(s => (
                <div key={s.label} style={cardStyle}><div style={{ fontSize: 10, color: "#4a4a5a", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>{s.label}</div><div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div></div>
              ))}
            </div>
          )}
          <div style={{ padding: "0 28px 32px", maxWidth: 1020, margin: "0 auto" }}>
            {comprasTab === "notas" && (
              <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} onClick={() => !processing && fileRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? "#34d399" : "#1a1a28"}`, borderRadius: 16, padding: processing ? "16px" : "30px 20px", textAlign: "center", cursor: processing ? "default" : "pointer", background: dragOver ? "#34d39906" : "#0a0a12", marginBottom: 16, marginTop: 8 }}>
                <input ref={fileRef} type="file" multiple accept="image/*" style={{ display: "none" }} onChange={e => processFiles(e.target.files)} />
                {processing ? (<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}><div style={{ width: 16, height: 16, border: "2px solid #34d399", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /><span style={{ color: "#6ee7b7", fontSize: 13, fontWeight: 500 }}>Analisando nota {processedCount + 1} de {totalToProcess}...</span></div>
                ) : (<><div style={{ fontSize: 28, marginBottom: 6, opacity: 0.4 }}>📸</div><p style={{ fontSize: 13, fontWeight: 500, color: "#888" }}>Arraste fotos de notas fiscais aqui</p><p style={{ fontSize: 11, color: "#3a3a4a" }}>ou clique para selecionar{catalog.length > 0 ? ` · ${catalog.length} produtos no catálogo` : ""}</p></>)}
              </div>
            )}
            {error && <div style={{ padding: "10px 14px", borderRadius: 8, background: "#ef444412", border: "1px solid #ef444425", color: "#fca5a5", fontSize: 12, marginBottom: 14 }}>{error}</div>}

            {/* Manual entry */}
            <div style={{ marginBottom: 14 }}>
              <button onClick={() => setShowManual(!showManual)} style={{ ...actionBtn(showManual ? "#34d399" : "#555"), display: "flex", alignItems: "center", gap: 6 }}>
                {showManual ? "✕ Fechar" : "+ Adicionar nota manualmente"}
              </button>
              {showManual && (
                <div className="anim" style={{ ...cardStyle, marginTop: 10, padding: 18 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#ccc", marginBottom: 14 }}>Adicionar item manualmente</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
                    <div style={{ gridColumn: "span 2" }}>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Produto *</label>
                      <input value={manualForm.product} onChange={e => setManualForm({ ...manualForm, product: e.target.value })} placeholder="Ex: Frango" style={{ ...inputBase, width: "100%" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Valor total (R$) *</label>
                      <input type="number" step="0.01" value={manualForm.totalPrice} onChange={e => setManualForm({ ...manualForm, totalPrice: e.target.value })} placeholder="0.00" style={{ ...inputBase, width: "100%" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Quantidade</label>
                      <input type="number" value={manualForm.quantity} onChange={e => setManualForm({ ...manualForm, quantity: e.target.value })} placeholder="1" style={{ ...inputBase, width: "100%" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Unidade</label>
                      <select value={manualForm.unit} onChange={e => setManualForm({ ...manualForm, unit: e.target.value })} style={{ ...inputBase, width: "100%" }}>
                        <option value="">—</option><option>kg</option><option>un</option><option>L</option><option>cx</option><option>pc</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Categoria</label>
                      <select value={manualForm.category} onChange={e => setManualForm({ ...manualForm, category: e.target.value })} style={{ ...inputBase, width: "100%" }}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICON[c]} {c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Fornecedor</label>
                      <input value={manualForm.supplier} onChange={e => setManualForm({ ...manualForm, supplier: e.target.value })} placeholder="Ex: Atacadão" style={{ ...inputBase, width: "100%" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "#666", display: "block", marginBottom: 4 }}>Data</label>
                      <input type="date" value={manualForm.date} onChange={e => setManualForm({ ...manualForm, date: e.target.value })} style={{ ...inputBase, width: "100%", colorScheme: "dark" }} />
                    </div>
                  </div>
                  <button onClick={addManualItem} style={{ ...actionBtn("#34d399"), fontWeight: 600 }}>Adicionar item</button>
                </div>
              )}
            </div>

            {filteredItems.length > 0 && comprasTab === "notas" && (
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                <button onClick={() => downloadCSV(filteredItems)} style={actionBtn("#38bdf8")}>↓ Exportar CSV</button>
                <button onClick={() => { clearItems(); setSelectedCats([]); setPeriod("all"); setSearchText(""); }} style={actionBtn("#ef4444")}>✕ Limpar</button>
              </div>
            )}
            {filteredItems.length > 0 && comprasTab === "notas" && (
              <div className="anim" style={{ background: "#0a0a12", borderRadius: 14, border: "1px solid #13131e", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr style={{ borderBottom: "1px solid #13131e" }}>{["Data", "Produto", "Nota", "Qtd", "Total", "Categoria", "Fornecedor", ""].map(h => (<th key={h} style={{ padding: "12px 10px", textAlign: "left", color: "#3a3a4a", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, whiteSpace: "nowrap" }}>{h}</th>))}</tr></thead>
                    <tbody>{filteredItems.map((item, idx) => {
                      const realIdx = items.indexOf(item); const isEd = editingIdx === realIdx; const nc = item.originalName && item.originalName.toLowerCase() !== item.product.toLowerCase(); return (
                        <tr key={item.id} style={{ borderBottom: "1px solid #0d0d16", background: isEd ? "#34d39906" : "transparent" }} onMouseEnter={e => { if (!isEd) e.currentTarget.style.background = "#ffffff03"; }} onMouseLeave={e => { if (!isEd) e.currentTarget.style.background = "transparent"; }}>
                          {isEd ? (<>
                            <td style={{ padding: "8px 10px" }}><input value={editForm.date || ""} onChange={e => setEditForm({ ...editForm, date: e.target.value })} style={{ ...inputBase, width: 90, fontSize: 12 }} /></td>
                            <td style={{ padding: "8px 10px" }}><input value={editForm.product} onChange={e => setEditForm({ ...editForm, product: e.target.value })} style={{ ...inputBase, width: "100%", fontSize: 12 }} /></td>
                            <td style={{ padding: "8px 6px", color: "#444", fontSize: 11 }}>{editForm.originalName || "—"}</td>
                            <td style={{ padding: "8px 6px" }}><input value={editForm.quantity || ""} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} style={{ ...inputBase, width: 50, fontSize: 12 }} /></td>
                            <td style={{ padding: "8px 6px" }}><input value={editForm.totalPrice} onChange={e => setEditForm({ ...editForm, totalPrice: e.target.value })} style={{ ...inputBase, width: 80, fontSize: 12, color: "#6ee7b7" }} /></td>
                            <td style={{ padding: "8px 6px" }}><select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} style={{ ...inputBase, fontSize: 11 }}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                            <td style={{ padding: "8px 6px" }}><input value={editForm.supplier || ""} onChange={e => setEditForm({ ...editForm, supplier: e.target.value })} style={{ ...inputBase, width: 90, fontSize: 12 }} /></td>
                            <td style={{ padding: "8px 8px", whiteSpace: "nowrap" }}><button onClick={saveEdit} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>✅</button><button onClick={() => setEditingIdx(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>❌</button></td>
                          </>) : (<>
                            <td style={{ padding: "10px 10px", color: "#777", fontSize: 11, whiteSpace: "nowrap" }}>{formatDateBR(item.isoDate)}</td>
                            <td style={{ padding: "10px 10px" }}><span style={{ color: "#ddd", fontWeight: 500 }}>{item.product}</span>{item.matched && <span style={{ marginLeft: 6, fontSize: 9, padding: "1px 6px", borderRadius: 8, background: "#34d39918", color: "#6ee7b7", border: "1px solid #34d39930" }}>catálogo</span>}</td>
                            <td style={{ padding: "10px 6px", color: nc ? "#666" : "#333", fontSize: 11, fontStyle: nc ? "italic" : "normal" }}>{nc ? item.originalName : "—"}</td>
                            <td style={{ padding: "10px 6px", color: "#666" }}>{item.quantity}{item.unit ? ` ${item.unit}` : ""}</td>
                            <td style={{ padding: "10px 6px", color: "#6ee7b7", fontWeight: 600 }}>{formatBRL(item.totalPrice)}</td>
                            <td style={{ padding: "10px 6px" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 12, fontSize: 10, fontWeight: 500, background: (CAT_COLOR[item.category] || "#666") + "14", color: CAT_COLOR[item.category] || "#888", border: `1px solid ${(CAT_COLOR[item.category] || "#666")}22` }}>{CAT_ICON[item.category]} {item.category}</span></td>
                            <td style={{ padding: "10px 6px", color: "#4a4a5a", fontSize: 11 }}>{item.supplier || "—"}</td>
                            <td style={{ padding: "10px 8px", whiteSpace: "nowrap" }}>
                              <button onClick={() => startEdit(idx)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, opacity: 0.35 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.35}>✏️</button>
                              <button onClick={() => deleteItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, opacity: 0.35 }} onMouseEnter={e => e.target.style.opacity = 1} onMouseLeave={e => e.target.style.opacity = 0.35}>🗑️</button>
                            </td>
                          </>)}
                        </tr>);
                    })}</tbody>
                    <tfoot><tr style={{ borderTop: "2px solid #13131e" }}><td colSpan={4} style={{ padding: "14px 10px", fontWeight: 700, color: "#555", textTransform: "uppercase", fontSize: 10, letterSpacing: 1.5 }}>Total ({filteredItems.length})</td><td style={{ padding: "14px 6px", fontWeight: 700, color: "#6ee7b7", fontSize: 16 }}>{formatBRL(totalGeral)}</td><td colSpan={3} /></tr></tfoot>
                  </table>
                </div>
              </div>
            )}
            {filteredItems.length > 0 && comprasTab === "resumo" && (
              <div className="anim" style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
                <div style={{ ...cardStyle, padding: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 20, textTransform: "uppercase", letterSpacing: 2 }}>Gastos por categoria</div>
                  {sortedCategories.map(([cat, total]) => (<div key={cat} style={{ marginBottom: 14 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 13, color: "#ccc", display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontSize: 15 }}>{CAT_ICON[cat]}</span>{cat}</span><span style={{ fontSize: 13, fontWeight: 600, color: CAT_COLOR[cat] }}>{formatBRL(total)} <span style={{ color: "#444", fontWeight: 400, fontSize: 11 }}>({((total / totalGeral) * 100).toFixed(1)}%)</span></span></div><div style={{ height: 5, background: "#13131e", borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: `${(total / maxCatValue) * 100}%`, background: CAT_COLOR[cat], borderRadius: 3, opacity: 0.7 }} /></div></div>))}
                </div>
                <div style={{ ...cardStyle, padding: 24 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 16, textTransform: "uppercase", letterSpacing: 2 }}>Top 10 maiores gastos</div>
                  {[...filteredItems].sort((a, b) => b.totalPrice - a.totalPrice).slice(0, 10).map((item, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 9 ? "1px solid #0e0e18" : "none" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 22, height: 22, borderRadius: 6, background: "#13131e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#555", fontWeight: 700 }}>{i + 1}</span><span style={{ color: "#ddd", fontSize: 13 }}>{item.product}</span></div><span style={{ color: "#6ee7b7", fontWeight: 600, fontSize: 13 }}>{formatBRL(item.totalPrice)}</span></div>))}
                </div>
              </div>
            )}
            {items.length === 0 && !processing && comprasTab === "notas" && (<div style={{ textAlign: "center", padding: "44px 20px" }}><div style={{ fontSize: 44, marginBottom: 12, opacity: 0.2 }}>📊</div><p style={{ fontSize: 14, color: "#444" }}>Nenhuma nota fiscal analisada</p></div>)}
          </div>
        </>
      )}

      {/* TAB: FUNCIONÁRIOS */}
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
    </div>
  );
}
