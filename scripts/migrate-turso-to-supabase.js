// Migra os dados do Turso (libSQL) pro Supabase (Postgres).
// Uso:
//   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... DATABASE_URL=postgresql://... node scripts/migrate-turso-to-supabase.js
//
// Seguro pra rodar várias vezes: usa ON CONFLICT DO NOTHING, não apaga nada.

import { createClient } from "@libsql/client";
import pg from "pg";
const { Pool } = pg;

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
});

// Schema: tabela Turso → (tabela Postgres quotada, colunas quotadas na ordem correta)
const TABLES = [
  { turso: "users", pg: `users`, cols: ["id","name","username","password","role","isAdmin"] },
  { turso: "invoiceItems", pg: `"invoiceItems"`, cols: ["id","product","originalName","matched","quantity","unit","unitPrice","totalPrice","category","supplier","date","isoDate","processedAt"] },
  { turso: "catalog", pg: `catalog`, cols: ["id","name","category"] },
  { turso: "punches", pg: `punches`, cols: ["id","userId","userName","userRole","date","time","type","timestamp"] },
  { turso: "clTemplates", pg: `"clTemplates"`, cols: ["id","title","category","items","createdAt"] },
  { turso: "clCompletions", pg: `"clCompletions"`, cols: ["id","templateId","templateTitle","category","userId","userName","date","time","timestamp","items","expiresAt"] },
  { turso: "reminders", pg: `reminders`, cols: ["id","text","authorId","authorName","createdAt","timestamp"] },
  { turso: "productionItems", pg: `"productionItems"`, cols: ["id","name","unit","minQty","qty","cycleKey","sortOrder"] },
  { turso: "productionCycle", pg: `"productionCycle"`, cols: ["id","cycleKey","concludedAt"] },
];

function normalize(v) {
  if (typeof v === "bigint") return Number(v);
  return v;
}

async function migrateTable(t) {
  const r = await turso.execute(`SELECT * FROM ${t.turso}`);
  if (!r.rows.length) {
    console.log(`  · ${t.turso}: 0 linhas (pulando)`);
    return 0;
  }

  const colList = t.cols.map(c => /[A-Z]/.test(c) ? `"${c}"` : c).join(", ");
  const placeholders = t.cols.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `INSERT INTO ${t.pg} (${colList}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`;

  let inserted = 0;
  for (const row of r.rows) {
    const values = t.cols.map(c => normalize(row[c]));
    await pool.query(sql, values);
    inserted++;
  }
  console.log(`  ✓ ${t.turso}: ${inserted} linhas migradas`);
  return inserted;
}

async function ensureSchema() {
  // Cria tabelas no Supabase antes da migração (espelhando o schema do api/index.js)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, username TEXT UNIQUE, password TEXT, role TEXT, "isAdmin" INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS "invoiceItems" (id TEXT PRIMARY KEY, product TEXT, "originalName" TEXT, matched INTEGER DEFAULT 0, quantity DOUBLE PRECISION, unit TEXT, "unitPrice" DOUBLE PRECISION, "totalPrice" DOUBLE PRECISION, category TEXT, supplier TEXT, date TEXT, "isoDate" TEXT, "processedAt" TEXT);
    CREATE TABLE IF NOT EXISTS catalog (id TEXT PRIMARY KEY, name TEXT, category TEXT);
    CREATE TABLE IF NOT EXISTS punches (id TEXT PRIMARY KEY, "userId" TEXT, "userName" TEXT, "userRole" TEXT, date TEXT, time TEXT, type TEXT, timestamp BIGINT);
    CREATE TABLE IF NOT EXISTS "clTemplates" (id TEXT PRIMARY KEY, title TEXT, category TEXT, items TEXT, "createdAt" TEXT);
    CREATE TABLE IF NOT EXISTS "clCompletions" (id TEXT PRIMARY KEY, "templateId" TEXT, "templateTitle" TEXT, category TEXT, "userId" TEXT, "userName" TEXT, date TEXT, time TEXT, timestamp BIGINT, items TEXT, "expiresAt" TEXT);
    CREATE TABLE IF NOT EXISTS reminders (id TEXT PRIMARY KEY, text TEXT, "authorId" TEXT, "authorName" TEXT, "createdAt" TEXT, timestamp BIGINT);
    CREATE TABLE IF NOT EXISTS "productionItems" (id TEXT PRIMARY KEY, name TEXT, unit TEXT, "minQty" DOUBLE PRECISION DEFAULT 0, qty DOUBLE PRECISION, "cycleKey" TEXT, "sortOrder" INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS "productionCycle" (id INTEGER PRIMARY KEY CHECK (id = 1), "cycleKey" TEXT, "concludedAt" TEXT);
    CREATE INDEX IF NOT EXISTS idx_items_isodate ON "invoiceItems"("isoDate" DESC);
    CREATE INDEX IF NOT EXISTS idx_punches_timestamp ON punches(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_clcompletions_timestamp ON "clCompletions"(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_reminders_timestamp ON reminders(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_production_sort ON "productionItems"("sortOrder" ASC, name ASC);
  `);
}

(async () => {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("Faltando TURSO_DATABASE_URL ou TURSO_AUTH_TOKEN");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("Faltando DATABASE_URL (connection string do Supabase)");
    process.exit(1);
  }

  console.log("1/3  Criando schema no Supabase...");
  await ensureSchema();

  console.log("2/3  Copiando dados Turso → Supabase...");
  let total = 0;
  for (const t of TABLES) {
    try {
      total += await migrateTable(t);
    } catch (err) {
      console.error(`  ✗ ${t.turso}: ${err.message}`);
    }
  }

  console.log(`3/3  Concluído. Total de linhas migradas: ${total}`);
  await pool.end();
  process.exit(0);
})().catch(err => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
