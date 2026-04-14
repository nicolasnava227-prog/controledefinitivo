import express from "express";
import { createClient } from "@libsql/client";

const API_KEY = process.env.ANTHROPIC_API_KEY || "";
const IS_VERCEL = !!process.env.VERCEL;

let db = null;
function getDb() {
  if (db) return db;
  if (IS_VERCEL && !process.env.TURSO_DATABASE_URL) {
    throw new Error("TURSO_DATABASE_URL não configurada. Adicione em Vercel → Settings → Environment Variables e faça Redeploy.");
  }
  db = createClient({
    url: process.env.TURSO_DATABASE_URL || "file:kuali.db",
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  return db;
}

let initPromise = null;
async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const db = getDb();
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, username TEXT UNIQUE, password TEXT, role TEXT, isAdmin INTEGER DEFAULT 0)`,
      `CREATE TABLE IF NOT EXISTS invoiceItems (id TEXT PRIMARY KEY, product TEXT, originalName TEXT, matched INTEGER DEFAULT 0, quantity REAL, unit TEXT, unitPrice REAL, totalPrice REAL, category TEXT, supplier TEXT, date TEXT, isoDate TEXT, processedAt TEXT)`,
      `CREATE TABLE IF NOT EXISTS catalog (id TEXT PRIMARY KEY, name TEXT, category TEXT)`,
      `CREATE TABLE IF NOT EXISTS punches (id TEXT PRIMARY KEY, userId TEXT, userName TEXT, userRole TEXT, date TEXT, time TEXT, type TEXT, timestamp INTEGER)`,
      `CREATE TABLE IF NOT EXISTS clTemplates (id TEXT PRIMARY KEY, title TEXT, category TEXT, items TEXT, createdAt TEXT)`,
      `CREATE TABLE IF NOT EXISTS clCompletions (id TEXT PRIMARY KEY, templateId TEXT, templateTitle TEXT, category TEXT, userId TEXT, userName TEXT, date TEXT, time TEXT, timestamp INTEGER, items TEXT, expiresAt TEXT)`,
      `CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, text TEXT, authorId TEXT, authorName TEXT, createdAt TEXT, timestamp INTEGER)`,
    ];
    for (const s of statements) await db.execute(s);
    const r = await db.execute("SELECT COUNT(*) as c FROM users");
    if (Number(r.rows[0].c) === 0) {
      await db.execute({
        sql: "INSERT INTO users (id, name, username, password, role, isAdmin) VALUES (?, ?, ?, ?, ?, ?)",
        args: ["admin", "Administrador", "admin", "admin", "Gerente", 1],
      });
    }
  })();
  return initPromise;
}

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(async (req, res, next) => {
  try { await init(); next(); } catch (e) { res.status(500).json({ error: String(e.message) }); }
});

const exec = (sql, args = []) => getDb().execute({ sql, args });
const bool = v => !!(typeof v === "bigint" ? Number(v) : v);

// ── Auth ──
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const r = await exec("SELECT * FROM users WHERE username = ? AND password = ?", [username, password]);
  if (!r.rows.length) return res.status(401).json({ error: "Credenciais inválidas" });
  const u = r.rows[0];
  res.json({ ...u, isAdmin: bool(u.isAdmin) });
});

// ── Users ──
app.get("/api/users", async (_, res) => {
  const r = await exec("SELECT * FROM users");
  res.json(r.rows.map(u => ({ ...u, isAdmin: bool(u.isAdmin) })));
});
app.post("/api/users", async (req, res) => {
  const { id, name, username, password, role, isAdmin } = req.body;
  try {
    await exec("INSERT INTO users (id, name, username, password, role, isAdmin) VALUES (?,?,?,?,?,?)", [id, name, username, password, role, isAdmin ? 1 : 0]);
    res.json({ ok: true });
  } catch { res.status(400).json({ error: "Usuário já existe" }); }
});
app.put("/api/users/:id", async (req, res) => {
  const { name, username, password, role, isAdmin } = req.body;
  await exec("UPDATE users SET name=?, username=?, password=?, role=?, isAdmin=? WHERE id=?", [name, username, password, role, isAdmin ? 1 : 0, req.params.id]);
  res.json({ ok: true });
});
app.delete("/api/users/:id", async (req, res) => {
  if (req.params.id === "admin") return res.status(400).json({ error: "Não pode remover admin" });
  await exec("DELETE FROM users WHERE id=?", [req.params.id]);
  res.json({ ok: true });
});

// ── Invoice Items ──
app.get("/api/items", async (_, res) => {
  const r = await exec("SELECT * FROM invoiceItems ORDER BY isoDate DESC");
  res.json(r.rows.map(i => ({ ...i, matched: bool(i.matched) })));
});
app.post("/api/items", async (req, res) => {
  for (const i of req.body) {
    await exec("INSERT INTO invoiceItems (id, product, originalName, matched, quantity, unit, unitPrice, totalPrice, category, supplier, date, isoDate, processedAt) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
      [i.id, i.product, i.originalName || "", i.matched ? 1 : 0, i.quantity, i.unit, i.unitPrice, i.totalPrice, i.category, i.supplier, i.date, i.isoDate, i.processedAt]);
  }
  res.json({ ok: true });
});
app.delete("/api/items/:id", async (req, res) => { await exec("DELETE FROM invoiceItems WHERE id=?", [req.params.id]); res.json({ ok: true }); });
app.delete("/api/items", async (_, res) => { await exec("DELETE FROM invoiceItems"); res.json({ ok: true }); });

// ── Catalog ──
app.get("/api/catalog", async (_, res) => { const r = await exec("SELECT * FROM catalog"); res.json(r.rows); });
app.post("/api/catalog", async (req, res) => { const { id, name, category } = req.body; await exec("INSERT INTO catalog (id, name, category) VALUES (?,?,?)", [id, name, category]); res.json({ ok: true }); });
app.put("/api/catalog/:id", async (req, res) => { const { name, category } = req.body; await exec("UPDATE catalog SET name=?, category=? WHERE id=?", [name, category, req.params.id]); res.json({ ok: true }); });
app.delete("/api/catalog/:id", async (req, res) => { await exec("DELETE FROM catalog WHERE id=?", [req.params.id]); res.json({ ok: true }); });

// ── Punches ──
app.get("/api/punches", async (_, res) => { const r = await exec("SELECT * FROM punches ORDER BY timestamp DESC"); res.json(r.rows); });
app.post("/api/punches", async (req, res) => {
  const p = req.body;
  await exec("INSERT INTO punches (id, userId, userName, userRole, date, time, type, timestamp) VALUES (?,?,?,?,?,?,?,?)",
    [p.id, p.userId, p.userName, p.userRole, p.date, p.time, p.type, p.timestamp]);
  res.json({ ok: true });
});

// ── Checklist Templates ──
app.get("/api/cl-templates", async (_, res) => {
  const r = await exec("SELECT * FROM clTemplates");
  res.json(r.rows.map(t => ({ ...t, items: JSON.parse(t.items) })));
});
app.post("/api/cl-templates", async (req, res) => {
  const t = req.body;
  await exec("INSERT INTO clTemplates (id, title, category, items, createdAt) VALUES (?,?,?,?,?)", [t.id, t.title, t.category, JSON.stringify(t.items), t.createdAt]);
  res.json({ ok: true });
});
app.put("/api/cl-templates/:id", async (req, res) => {
  const { title, category, items } = req.body;
  await exec("UPDATE clTemplates SET title=?, category=?, items=? WHERE id=?", [title, category, JSON.stringify(items), req.params.id]);
  res.json({ ok: true });
});
app.delete("/api/cl-templates/:id", async (req, res) => { await exec("DELETE FROM clTemplates WHERE id=?", [req.params.id]); res.json({ ok: true }); });

// ── Checklist Completions ──
app.get("/api/cl-completions", async (_, res) => {
  const r = await exec("SELECT * FROM clCompletions ORDER BY timestamp DESC");
  res.json(r.rows.map(c => ({ ...c, items: JSON.parse(c.items) })));
});
app.post("/api/cl-completions", async (req, res) => {
  const c = req.body;
  await exec("INSERT INTO clCompletions (id, templateId, templateTitle, category, userId, userName, date, time, timestamp, items, expiresAt) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
    [c.id, c.templateId, c.templateTitle, c.category, c.userId, c.userName, c.date, c.time, c.timestamp, JSON.stringify(c.items), c.expiresAt]);
  res.json({ ok: true });
});

// ── Reminders ──
app.get("/api/reminders", async (_, res) => {
  const r = await exec("SELECT * FROM reminders ORDER BY timestamp DESC");
  res.json(r.rows);
});
app.post("/api/reminders", async (req, res) => {
  const r = req.body;
  await exec("INSERT INTO reminders (id, text, authorId, authorName, createdAt, timestamp) VALUES (?,?,?,?,?,?)",
    [r.id, r.text, r.authorId, r.authorName, r.createdAt, r.timestamp]);
  res.json({ ok: true });
});
app.delete("/api/reminders/:id", async (req, res) => { await exec("DELETE FROM reminders WHERE id=?", [req.params.id]); res.json({ ok: true }); });

// ── Claude API Proxy ──
app.post("/api/analyze", async (req, res) => {
  if (!API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY não configurada" });
  try {
    const { base64, mediaType, prompt } = req.body;
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mediaType, data: base64 } }, { type: "text", text: prompt }] }] }),
    });
    const data = await r.json();
    if (data.error) return res.status(400).json({ error: data.error.message });
    const text = data.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    res.json(JSON.parse(text.replace(/```json|```/g, "").trim()));
  } catch (err) { res.status(500).json({ error: String(err.message) }); }
});

export default app;
