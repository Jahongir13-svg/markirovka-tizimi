import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const TEAMS = [
  { id: 1, name: "Komanda 1", color: "#6366f1" },
  { id: 2, name: "Komanda 2", color: "#f59e0b" },
  { id: 3, name: "Komanda 3", color: "#10b981" },
  { id: 4, name: "Komanda 4", color: "#ef4444" },
  { id: 5, name: "Komanda 5", color: "#8b5cf6" },
  { id: 6, name: "Komanda 6", color: "#06b6d4" },
  { id: 7, name: "Komanda 7", color: "#f97316" },
  { id: 8, name: "Komanda 8", color: "#84cc16" },
  { id: 9, name: "Komanda 9", color: "#ec4899" },
  { id: 10, name: "Komanda 10", color: "#14b8a6" },
];

const CATEGORIES = [
  { id: "shoes", name: "Oyoq kiyim", points: 3, icon: "👟" },
  { id: "clothes", name: "Kiyim-kechak", points: 2, icon: "👕" },
  { id: "accessories", name: "Aksessuarlar", points: 1, icon: "👜" },
  { id: "electronics", name: "Elektronika", points: 4, icon: "📱" },
  { id: "food", name: "Oziq-ovqat", points: 2, icon: "🥫" },
  { id: "cosmetics", name: "Kosmetika", points: 2, icon: "💄" },
  { id: "household", name: "Uy jihozlari", points: 3, icon: "🏠" },
  { id: "other", name: "Boshqa", points: 1, icon: "📦" },
];

const KPI_TARGETS = { daily: 200, weekly: 1000, monthly: 4000 };

// ─── STORAGE ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "marking_platform_v1";

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // Ensure artikul field exists on all records
      if (data.records) {
        data.records = data.records.map((r: Record) => ({
          ...r,
          artikul: r.artikul || ""
        }));
      }
      return data;
    }
  } catch {}
  return { records: [], teams: TEAMS, categories: CATEGORIES };
}

function saveData(data: { records: unknown[]; teams: typeof TEAMS; categories: typeof CATEGORIES }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function formatDate(str: string) {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}.${m}.${y}`;
}

// ─── TYPES ──────────────────────────────────────────────────────────────────
interface Team {
  id: number;
  name: string;
  color: string;
}

interface Category {
  id: string;
  name: string;
  points: number;
  icon: string;
}

interface Record {
  id: number;
  teamId: number;
  teamName: string;
  date: string;
  ts: string;
  qty: number;
  categoryId: string;
  categoryName: string;
  points: number;
  barcode: string | null;
  artikul: string;
}

interface User {
  role: "admin" | "worker";
  teamId?: number;
}

interface DbData {
  records: Record[];
  teams: Team[];
  categories: Category[];
}

interface ToastData {
  msg: string;
  type: "success" | "error";
}

// ─── MINI BAR CHART ─────────────────────────────────────────────────────────
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ width: "100%", background: "#1e293b", borderRadius: 4, height: 8, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, background: color, height: "100%", borderRadius: 4, transition: "width 0.5s" }} />
    </div>
  );
}

// ─── CIRCLE KPI ─────────────────────────────────────────────────────────────
function CircleKPI({ value, target, label, color }: { value: number; target: number; label: string; color: string }) {
  const pct = Math.min(100, target > 0 ? (value / target) * 100 : 0);
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={90} height={90} viewBox="0 0 90 90">
        <circle cx={45} cy={45} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
        <circle
          cx={45} cy={45} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeDashoffset={circ / 4}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s" }}
        />
        <text x={45} y={48} textAnchor="middle" fontSize={14} fontWeight={700} fill="#f1f5f9">
          {Math.round(pct)}%
        </text>
      </svg>
      <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>{label}</div>
      <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 600 }}>{value.toLocaleString()} / {target.toLocaleString()}</div>
    </div>
  );
}

// ─── BAR CHART (full) ────────────────────────────────────────────────────────
function BarChart({ data, color }: { data: { value: number; label: string }[]; color: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120, padding: "8px 0" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ fontSize: 10, color: "#64748b" }}>{d.value}</div>
          <div
            style={{
              width: "100%",
              height: `${Math.max(4, (d.value / max) * 100)}px`,
              background: color || "#6366f1",
              borderRadius: "3px 3px 0 0",
              transition: "height 0.4s",
            }}
          />
          <div style={{ fontSize: 9, color: "#64748b", textAlign: "center", lineHeight: 1.2 }}>{d.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, big }: { icon: string; label: string; value: string | number; color: string; big?: boolean }) {
  return (
    <div style={{
      background: "#1e293b", borderRadius: 10, padding: big ? "16px 12px" : "12px 10px",
      border: "1px solid #334155", textAlign: "center"
    }}>
      <div style={{ fontSize: big ? 22 : 18 }}>{icon}</div>
      <div style={{ fontSize: big ? 22 : 18, fontWeight: 800, color: color, lineHeight: 1.2, marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Toast({ toast }: { toast: ToastData | null }) {
  if (!toast) return null;
  return (
    <div style={{
      position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
      background: toast.type === "error" ? "#450a0a" : "#052e16",
      border: `1px solid ${toast.type === "error" ? "#ef4444" : "#22c55e"}`,
      color: toast.type === "error" ? "#fca5a5" : "#86efac",
      padding: "10px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
      zIndex: 999, whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    }}>
      {toast.msg}
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0a0f1e",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#f1f5f9",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px",
    background: "#0f1929",
    borderBottom: "1px solid #1e293b",
    position: "sticky", top: 0, zIndex: 10,
  } as React.CSSProperties,
  card: {
    background: "#0f1929",
    border: "1px solid #1e293b",
    borderRadius: 12,
    padding: 16,
  },
  field: { marginBottom: 14 },
  label: { display: "block", fontSize: 11, color: "#64748b", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: {
    width: "100%", background: "#1e293b", border: "1px solid #334155",
    borderRadius: 8, padding: "10px 12px", color: "#f1f5f9", fontSize: 14,
    outline: "none", boxSizing: "border-box",
  } as React.CSSProperties,
  select: {
    width: "100%", background: "#1e293b", border: "1px solid #334155",
    borderRadius: 8, padding: "10px 12px", color: "#f1f5f9", fontSize: 14,
    outline: "none",
  },
  btn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "#1e293b", border: "1px solid #334155",
    borderRadius: 8, padding: "10px 14px", color: "#94a3b8",
    fontSize: 13, cursor: "pointer", fontFamily: "inherit",
    transition: "all 0.15s",
  } as React.CSSProperties,
  btnSm: {
    background: "#1e293b", border: "1px solid #334155",
    borderRadius: 6, padding: "6px 12px", color: "#94a3b8",
    fontSize: 12, cursor: "pointer", fontFamily: "inherit",
  } as React.CSSProperties,
  btnPrimary: {
    background: "#4f46e5", border: "none", color: "#fff",
  },
  recRow: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#1e293b", borderRadius: 8, padding: "8px 10px",
  },
};

// ─── LOGIN ──────────────────────────────────────────────────────────────────
function LoginScreen({
  teams,
  loginTeam,
  setLoginTeam,
  loginRole,
  setLoginRole,
  adminPass,
  setAdminPass,
  onLogin,
  toast
}: {
  teams: Team[];
  loginTeam: number;
  setLoginTeam: (n: number) => void;
  loginRole: string;
  setLoginRole: (r: string) => void;
  adminPass: string;
  setAdminPass: (p: string) => void;
  onLogin: () => void;
  toast: ToastData | null;
}) {
  return (
    <div style={{ ...S.page, minHeight: "100vh", background: "#0a0f1e" }}>
      <Toast toast={toast} />
      <div style={{ ...S.card, maxWidth: 420, margin: "auto", marginTop: "10vh" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9" }}>Markirovka Tizimi</div>
          <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Kirish uchun ma'lumotlarni tanlang</div>
        </div>

        <div style={S.field}>
          <label style={S.label}>Rol tanlang</label>
          <div style={{ display: "flex", gap: 8 }}>
            {["worker", "admin"].map(r => (
              <button key={r} onClick={() => setLoginRole(r)} style={{
                ...S.btn, flex: 1,
                background: loginRole === r ? "#6366f1" : "#1e293b",
                color: loginRole === r ? "#fff" : "#94a3b8",
              }}>
                {r === "admin" ? "Admin" : "Xodim"}
              </button>
            ))}
          </div>
        </div>

        {loginRole === "worker" && (
          <div style={S.field}>
            <label style={S.label}>Komandangizni tanlang</label>
            <select style={S.select} value={loginTeam} onChange={e => setLoginTeam(Number(e.target.value))}>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        )}

        {loginRole === "admin" && (
          <div style={S.field}>
            <label style={S.label}>Admin paroli</label>
            <input
              type="password" style={S.input}
              placeholder="Parolni kiriting"
              value={adminPass} onChange={e => setAdminPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onLogin()}
            />
          </div>
        )}

        <button onClick={onLogin} style={{ ...S.btn, ...S.btnPrimary, width: "100%", marginTop: 8 }}>
          Kirish
        </button>
      </div>
    </div>
  );
}

// ─── WORKER SCREEN ───────────────────────────────────────────────────────────
function WorkerScreen({
  team,
  categories,
  records,
  onAdd,
  onLogout,
  onStats,
  toast,
  showToast
}: {
  team: Team;
  categories: Category[];
  records: Record[];
  onAdd: (r: Record) => void;
  onLogout: () => void;
  onStats: () => void;
  toast: ToastData | null;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [qty, setQty] = useState("");
  const [catId, setCatId] = useState(categories[0]?.id || "");
  const [artikul, setArtikul] = useState("");
  const [scanBuffer, setScanBuffer] = useState("");
  const [lastScanned, setLastScanned] = useState("");

  const todayRecords = records.filter(r => r.date === today() && r.teamId === team.id);
  const todayCount = todayRecords.reduce((s, r) => s + r.qty, 0);
  const todayPoints = todayRecords.reduce((s, r) => s + r.points, 0);

  // Barcode scanner: captures barcode to artikul field
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        if (scanBuffer.length > 3) {
          setArtikul(scanBuffer);
          setLastScanned(scanBuffer);
          setScanBuffer("");
          showToast(`Shtrix kod: ${scanBuffer}`, "success");
        }
        return;
      }
      if (e.key.length === 1) setScanBuffer(p => p + e.key);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scanBuffer, showToast]);

  function handleSubmit(qtyVal: number, category: string, barcode: string | null = null) {
    const n = Number(qtyVal);
    if (!n || n < 1) { showToast("Son kiriting!", "error"); return; }
    if (!artikul.trim()) { showToast("Artikul kiriting!", "error"); return; }
    const c = categories.find(x => x.id === category);
    const rec: Record = {
      id: Date.now(),
      teamId: team.id,
      teamName: team.name,
      date: today(),
      ts: new Date().toISOString(),
      qty: n,
      categoryId: category,
      categoryName: c?.name || "",
      points: n * (c?.points || 1),
      barcode: barcode,
      artikul: artikul.trim(),
    };
    onAdd(rec);
    setQty("");
    setArtikul("");
    setLastScanned("");
    showToast(`${n} ta ${c?.name} qo'shildi (+${rec.points} ball)`);
  }

  const kpiPct = Math.min(100, (todayCount / KPI_TARGETS.daily) * 100);

  return (
    <div style={S.page}>
      <Toast toast={toast} />
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: team.color }} />
          <span style={{ fontWeight: 700, color: "#f1f5f9" }}>{team.name}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onStats} style={S.btnSm}>Statistika</button>
          <button onClick={onLogout} style={S.btnSm}>Chiqish</button>
        </div>
      </div>

      <div style={{ maxWidth: 540, margin: "0 auto", padding: "16px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          <StatCard icon="📦" label="Bugun soni" value={todayCount.toLocaleString()} color={team.color} />
          <StatCard icon="⭐" label="Bugun ball" value={todayPoints.toLocaleString()} color="#f59e0b" />
          <StatCard icon="🎯" label="KPI" value={`${Math.round(kpiPct)}%`} color="#10b981" />
        </div>

        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>Kunlik maqsad</span>
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{todayCount} / {KPI_TARGETS.daily}</span>
          </div>
          <MiniBar value={todayCount} max={KPI_TARGETS.daily} color={team.color} />
        </div>

        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>
            Yangi kiritish
          </div>

          <div style={S.field}>
            <label style={S.label}>Kategoriya</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {categories.map(c => (
                <button key={c.id} onClick={() => setCatId(c.id)} style={{
                  ...S.btn, justifyContent: "flex-start", gap: 6,
                  background: catId === c.id ? "#1e3a5f" : "#1e293b",
                  border: `1px solid ${catId === c.id ? "#6366f1" : "#334155"}`,
                  color: catId === c.id ? "#a5b4fc" : "#94a3b8",
                  fontSize: 12,
                }}>
                  {c.icon} {c.name}
                  <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.7 }}>+{c.points}b</span>
                </button>
              ))}
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>Artikul (shtrix kodni scanerlang)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text" style={{ ...S.input, flex: 1, fontSize: 16, textAlign: "center" }}
                placeholder="Artikul yoki shtrix kod"
                value={artikul}
                onChange={e => setArtikul(e.target.value)}
              />
            </div>
            {lastScanned && (
              <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>
                Scanerlangan: {lastScanned}
              </div>
            )}
          </div>

          <div style={S.field}>
            <label style={S.label}>Son kiriting</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="number" min="1" style={{ ...S.input, flex: 1, fontSize: 20, textAlign: "center" }}
                placeholder="0"
                value={qty}
                onChange={e => setQty(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit(Number(qty), catId)}
              />
              <button onClick={() => handleSubmit(Number(qty), catId)} style={{ ...S.btn, ...S.btnPrimary, padding: "0 20px", fontSize: 18 }}>
                ✓
              </button>
            </div>
          </div>

          {scanBuffer && (
            <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 4 }}>
              Scanerlanmoqda: {scanBuffer}...
            </div>
          )}
        </div>

        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 10 }}>
            Bugungi kiritishlar
          </div>
          {todayRecords.length === 0 && (
            <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
              Hali kiritish yo'q
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
            {[...todayRecords].reverse().map(r => (
              <div key={r.id} style={S.recRow}>
                <span style={{ fontSize: 16 }}>
                  {categories.find(c => c.id === r.categoryId)?.icon || "📦"}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: "#cbd5e1" }}>{r.categoryName}</div>
                  <div style={{ fontSize: 10, color: "#64748b" }}>{r.artikul}</div>
                  <div style={{ fontSize: 10, color: "#475569" }}>{new Date(r.ts).toLocaleTimeString("uz")}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{r.qty} ta</div>
                  <div style={{ fontSize: 10, color: "#f59e0b" }}>+{r.points} b</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN SCREEN ────────────────────────────────────────────────────────────
function AdminDashboard({ db }: { db: DbData }) {
  const todayRecs = db.records.filter(r => r.date === today());
  const totalToday = todayRecs.reduce((s, r) => s + r.qty, 0);
  const totalPoints = todayRecs.reduce((s, r) => s + r.points, 0);

  const teamStats = db.teams.map(t => {
    const recs = todayRecs.filter(r => r.teamId === t.id);
    return {
      ...t,
      count: recs.reduce((s, r) => s + r.qty, 0),
      points: recs.reduce((s, r) => s + r.points, 0),
    };
  }).sort((a, b) => b.count - a.count);

  const maxCount = Math.max(...teamStats.map(t => t.count), 1);

  const days: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const cnt = db.records.filter(r => r.date === ds).reduce((s, r) => s + r.qty, 0);
    days.push({ label: ["Yak", "Du", "Se", "Ch", "Pa", "Sh", "Ya"][d.getDay()], value: cnt });
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard icon="📦" label="Bugun jami" value={totalToday.toLocaleString()} color="#6366f1" big />
        <StatCard icon="⭐" label="Bugun ball" value={totalPoints.toLocaleString()} color="#f59e0b" big />
        <StatCard icon="👥" label="Faol komandalar" value={new Set(todayRecs.map(r => r.teamId)).size} color="#10b981" big />
      </div>

      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>Oxirgi 7 kun</div>
        <BarChart data={days} color="#6366f1" />
      </div>

      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>Bugungi reyting</div>
        {teamStats.map((t, i) => (
          <div key={t.id} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 13, color: "#cbd5e1" }}>
                <span style={{ color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#c97d4e" : "#475569", marginRight: 6 }}>
                  {i === 0 ? "1." : i === 1 ? "2." : i === 2 ? "3." : `${i + 1}.`}
                </span>
                {t.name}
              </span>
              <span style={{ fontSize: 12, color: "#94a3b8" }}>
                {t.count} ta · {t.points} ball
              </span>
            </div>
            <MiniBar value={t.count} max={maxCount} color={t.color} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminTeams({ db, setDb, showToast }: { db: DbData; setDb: (d: DbData) => void; showToast: (msg: string, type?: "success" | "error") => void }) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  function addTeam() {
    if (!newName.trim()) { showToast("Nom kiriting!", "error"); return; }
    const team: Team = { id: Date.now(), name: newName.trim(), color: newColor };
    setDb(p => ({ ...p, teams: [...p.teams, team] }));
    setNewName(""); showToast("Komanda qo'shildi!");
  }

  function removeTeam(id: number) {
    setDb(p => ({ ...p, teams: p.teams.filter(t => t.id !== id) }));
    showToast("O'chirildi");
  }

  return (
    <div>
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>Yangi komanda</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={{ ...S.input, flex: 1 }} placeholder="Komanda nomi" value={newName} onChange={e => setNewName(e.target.value)} />
          <input type="color" style={{ width: 44, height: 44, border: "none", background: "none", cursor: "pointer" }} value={newColor} onChange={e => setNewColor(e.target.value)} />
          <button onClick={addTeam} style={{ ...S.btn, ...S.btnPrimary }}>Qo'sh</button>
        </div>
      </div>

      <div style={{ ...S.card, marginTop: 12 }}>
        {db.teams.map(t => (
          <div key={t.id} style={{ ...S.recRow, marginBottom: 8 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 13, color: "#cbd5e1" }}>{t.name}</div>
            <button onClick={() => removeTeam(t.id)} style={{ ...S.btnSm, background: "#450a0a", color: "#fca5a5" }}>O'chir</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminCategories({ db, setDb, showToast }: { db: DbData; setDb: (d: DbData) => void; showToast: (msg: string, type?: "success" | "error") => void }) {
  const [newName, setNewName] = useState("");
  const [newPts, setNewPts] = useState(1);
  const [newIcon, setNewIcon] = useState("📦");

  function addCat() {
    if (!newName.trim()) { showToast("Nom kiriting!", "error"); return; }
    const c: Category = { id: Date.now().toString(), name: newName.trim(), points: Number(newPts), icon: newIcon };
    setDb(p => ({ ...p, categories: [...p.categories, c] }));
    setNewName(""); showToast("Kategoriya qo'shildi!");
  }

  function removeCat(id: string) {
    setDb(p => ({ ...p, categories: p.categories.filter(c => c.id !== id) }));
    showToast("O'chirildi");
  }

  return (
    <div>
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>Yangi kategoriya</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input style={{ ...S.input, width: 48 }} placeholder="I" value={newIcon} onChange={e => setNewIcon(e.target.value)} />
          <input style={{ ...S.input, flex: 1 }} placeholder="Kategoriya nomi" value={newName} onChange={e => setNewName(e.target.value)} />
          <input type="number" min="1" max="100" style={{ ...S.input, width: 70 }} placeholder="Ball" value={newPts} onChange={e => setNewPts(e.target.value)} />
          <button onClick={addCat} style={{ ...S.btn, ...S.btnPrimary }}>Qo'sh</button>
        </div>
      </div>

      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {db.categories.map(c => (
            <div key={c.id} style={S.recRow}>
              <span style={{ fontSize: 18 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#cbd5e1" }}>{c.name}</div>
                <div style={{ fontSize: 10, color: "#f59e0b" }}>+{c.points} ball</div>
              </div>
              <button onClick={() => removeCat(c.id)} style={{ ...S.btnSm, background: "#450a0a", color: "#fca5a5", padding: "2px 8px" }}>X</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminRecords({ db, setDb, showToast }: { db: DbData; setDb: (d: DbData) => void; showToast: (msg: string, type?: "success" | "error") => void }) {
  const [filterTeam, setFilterTeam] = useState("all");
  const [filterDate, setFilterDate] = useState(today());

  const filtered = db.records.filter(r =>
    (filterTeam === "all" || r.teamId === Number(filterTeam)) &&
    (!filterDate || r.date === filterDate)
  ).sort((a, b) => b.ts.localeCompare(a.ts));

  function deleteRecord(id: number) {
    setDb(p => ({ ...p, records: p.records.filter(r => r.id !== id) }));
    showToast("Yozuv o'chirildi");
  }

  return (
    <div>
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select style={{ ...S.select, flex: 1 }} value={filterTeam} onChange={e => setFilterTeam(e.target.value)}>
            <option value="all">Barcha komandalar</option>
            {db.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <input type="date" style={{ ...S.input, flex: 1 }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
          Topildi: {filtered.length} ta yozuv · Jami: {filtered.reduce((s, r) => s + r.qty, 0)} ta tovar
        </div>
      </div>

      <div style={S.card}>
        <div style={{ maxHeight: 450, overflowY: "auto" }}>
          {filtered.length === 0 && <div style={{ color: "#475569", textAlign: "center", padding: 20 }}>Yozuv yo'q</div>}
          {filtered.map(r => (
            <div key={r.id} style={{ ...S.recRow, marginBottom: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: db.teams.find(t => t.id === r.teamId)?.color || "#475569", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: "#cbd5e1" }}>{r.teamName} · {r.categoryName}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{r.artikul}</div>
                <div style={{ fontSize: 10, color: "#475569" }}>{new Date(r.ts).toLocaleString("uz")}</div>
              </div>
              <div style={{ textAlign: "right", marginRight: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{r.qty} ta</div>
                <div style={{ fontSize: 10, color: "#f59e0b" }}>+{r.points} b</div>
              </div>
              <button onClick={() => deleteRecord(r.id)} style={{ ...S.btnSm, background: "#450a0a", color: "#fca5a5", padding: "2px 6px" }}>X</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminExport({ db, showToast }: { db: DbData; showToast: (msg: string, type?: "success" | "error") => void }) {
  const [period, setPeriod] = useState("week");
  const [expTeam, setExpTeam] = useState("all");

  function exportExcel() {
    const now = new Date();
    let startDate: string;
    if (period === "week") startDate = startOfWeek(now);
    else if (period === "month") startDate = startOfMonth(now);
    else startDate = "2000-01-01";

    const filtered = db.records.filter(r =>
      r.date >= startDate &&
      (expTeam === "all" || r.teamId === Number(expTeam))
    );

    if (filtered.length === 0) { showToast("Ma'lumot yo'q!", "error"); return; }

    const summaryMap: Record<string, { Sana: string; Komanda: string; Son: number; Ball: number }> = {};
    filtered.forEach(r => {
      const key = `${r.date}__${r.teamId}`;
      if (!summaryMap[key]) summaryMap[key] = { Sana: formatDate(r.date), Komanda: r.teamName, Son: 0, Ball: 0 };
      summaryMap[key].Son += r.qty;
      summaryMap[key].Ball += r.points;
    });
    const summary = Object.values(summaryMap).sort((a, b) => a.Sana.localeCompare(b.Sana));

    const detail = filtered.map(r => ({
      Sana: formatDate(r.date),
      Vaqt: new Date(r.ts).toLocaleTimeString("uz"),
      Komanda: r.teamName,
      Kategoriya: r.categoryName,
      Artikul: r.artikul,
      Son: r.qty,
      Ball: r.points,
      Shtrix: r.barcode || "",
    })).sort((a, b) => a.Sana.localeCompare(b.Sana));

    const catMap: Record<string, { Kategoriya: string; Son: number; Ball: number }> = {};
    filtered.forEach(r => {
      if (!catMap[r.categoryName]) catMap[r.categoryName] = { Kategoriya: r.categoryName, Son: 0, Ball: 0 };
      catMap[r.categoryName].Son += r.qty;
      catMap[r.categoryName].Ball += r.points;
    });
    const catSheet = Object.values(catMap).sort((a, b) => b.Son - a.Son);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Umumiy");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detail), "Batafsil");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catSheet), "Kategoriyalar");

    const label = period === "week" ? "haftalik" : period === "month" ? "oylik" : "umumiy";
    XLSX.writeFile(wb, `markirovka_${label}_${today()}.xlsx`);
    showToast("Excel yuklab olindi!");
  }

  return (
    <div style={S.card}>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginBottom: 16 }}>Excel Hisobot</div>

      <div style={S.field}>
        <label style={S.label}>Davr</label>
        <div style={{ display: "flex", gap: 8 }}>
          {[["week", "Haftalik"], ["month", "Oylik"], ["all", "Hammasi"]].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)} style={{
              ...S.btn, flex: 1,
              background: period === v ? "#6366f1" : "#1e293b",
              color: period === v ? "#fff" : "#94a3b8",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={S.field}>
        <label style={S.label}>Komanda</label>
        <select style={S.select} value={expTeam} onChange={e => setExpTeam(e.target.value)}>
          <option value="all">Barcha komandalar</option>
          {db.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <button onClick={exportExcel} style={{ ...S.btn, ...S.btnPrimary, width: "100%", fontSize: 15, marginTop: 8 }}>
        Excel yuklash
      </button>

      <div style={{ marginTop: 16, padding: 12, background: "#0f1929", borderRadius: 8 }}>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Hisobot tarkibi:</div>
        <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.8 }}>
          Umumiy — sanalar bo'yicha komanda jami<br />
          Batafsil — har bir kiritish yozuvi<br />
          Kategoriyalar — tovar turlari tahlili
        </div>
      </div>
    </div>
  );
}

function AdminScreen({
  db,
  setDb,
  onLogout,
  onStats,
  toast,
  showToast
}: {
  db: DbData;
  setDb: (d: DbData) => void;
  onLogout: () => void;
  onStats: () => void;
  toast: ToastData | null;
  showToast: (msg: string, type?: "success" | "error") => void;
}) {
  const [tab, setTab] = useState("dashboard");

  return (
    <div style={S.page}>
      <Toast toast={toast} />
      <div style={S.header}>
        <div style={{ fontWeight: 700, color: "#f1f5f9", fontSize: 15 }}>Admin Panel</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onStats} style={S.btnSm}>Statistika</button>
          <button onClick={onLogout} style={S.btnSm}>Chiqish</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "12px 16px 0", overflowX: "auto" }}>
        {[
          { id: "dashboard", label: "Bosh sahifa" },
          { id: "teams", label: "Komandalar" },
          { id: "categories", label: "Kategoriyalar" },
          { id: "records", label: "Yozuvlar" },
          { id: "export", label: "Eksport" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            ...S.btnSm,
            background: tab === t.id ? "#6366f1" : "#1e293b",
            color: tab === t.id ? "#fff" : "#94a3b8",
            whiteSpace: "nowrap",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "16px", maxWidth: 900, margin: "0 auto" }}>
        {tab === "dashboard" && <AdminDashboard db={db} />}
        {tab === "teams" && <AdminTeams db={db} setDb={setDb} showToast={showToast} />}
        {tab === "categories" && <AdminCategories db={db} setDb={setDb} showToast={showToast} />}
        {tab === "records" && <AdminRecords db={db} setDb={setDb} showToast={showToast} />}
        {tab === "export" && <AdminExport db={db} showToast={showToast} />}
      </div>
    </div>
  );
}

// ─── STATS SCREEN ─────────────────────────────────────────────────────────────
function StatsScreen({
  db,
  onBack,
  currentUser,
  showToast,
  toast
}: {
  db: DbData;
  onBack: () => void;
  currentUser: User | null;
  showToast: (msg: string, type?: "success" | "error") => void;
  toast: ToastData | null;
}) {
  const [period, setPeriod] = useState("today");
  const [selTeam, setSelTeam] = useState("all");

  const isWorker = currentUser?.role === "worker";
  const effectiveTeam = isWorker ? currentUser?.teamId : (selTeam === "all" ? null : Number(selTeam));

  function getFiltered() {
    const now = new Date();
    let startDate: string;
    if (period === "today") startDate = today();
    else if (period === "week") startDate = startOfWeek(now);
    else startDate = startOfMonth(now);

    return db.records.filter(r =>
      r.date >= startDate &&
      (!effectiveTeam || r.teamId === effectiveTeam)
    );
  }

  const recs = getFiltered();
  const totalQty = recs.reduce((s, r) => s + r.qty, 0);
  const totalPts = recs.reduce((s, r) => s + r.points, 0);

  const teamKPI = db.teams.map(t => {
    const tr = recs.filter(r => r.teamId === t.id);
    const qty = tr.reduce((s, r) => s + r.qty, 0);
    const pts = tr.reduce((s, r) => s + r.points, 0);
    const target = period === "today" ? KPI_TARGETS.daily : period === "week" ? KPI_TARGETS.weekly : KPI_TARGETS.monthly;
    return { ...t, qty, pts, target, pct: Math.min(100, target > 0 ? (qty / target) * 100 : 0) };
  }).sort((a, b) => b.qty - a.qty);

  const catBreak = db.categories.map(c => {
    const cr = recs.filter(r => r.categoryId === c.id);
    return { ...c, qty: cr.reduce((s, r) => s + r.qty, 0), pts: cr.reduce((s, r) => s + r.points, 0) };
  }).filter(c => c.qty > 0).sort((a, b) => b.qty - a.qty);

  const chartData: { label: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const dayRecs = db.records.filter(r => r.date === ds && (!effectiveTeam || r.teamId === effectiveTeam));
    chartData.push({
      label: ["Yak", "Du", "Se", "Ch", "Pa", "Sh", "Ya"][d.getDay()],
      value: dayRecs.reduce((s, r) => s + r.qty, 0)
    });
  }

  const kpiTarget = period === "today" ? KPI_TARGETS.daily : period === "week" ? KPI_TARGETS.weekly : KPI_TARGETS.monthly;
  const myTeam = effectiveTeam ? db.teams.find(t => t.id === effectiveTeam) : null;

  return (
    <div style={S.page}>
      <Toast toast={toast} />
      <div style={S.header}>
        <button onClick={onBack} style={S.btnSm}>Orqaga</button>
        <div style={{ fontWeight: 700, color: "#f1f5f9" }}>Statistika</div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 12px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[["today", "Bugun"], ["week", "Hafta"], ["month", "Oy"]].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)} style={{
              ...S.btnSm,
              background: period === v ? "#6366f1" : "#1e293b",
              color: period === v ? "#fff" : "#94a3b8",
              flex: 1,
            }}>{l}</button>
          ))}
          {!isWorker && (
            <select style={{ ...S.select, flex: 2 }} value={selTeam} onChange={e => setSelTeam(e.target.value)}>
              <option value="all">Barcha komandalar</option>
              {db.teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
        </div>

        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 16 }}>KPI Holati</div>
          <div style={{ display: "flex", justifyContent: "space-around", flexWrap: "wrap", gap: 16 }}>
            <CircleKPI value={totalQty} target={kpiTarget} label="Soni bo'yicha" color="#6366f1" />
            <CircleKPI value={totalPts} target={kpiTarget * 2} label="Ball bo'yicha" color="#f59e0b" />
            {myTeam && <CircleKPI value={totalQty} target={KPI_TARGETS.daily} label="Kunlik maqsad" color={myTeam.color} />}
          </div>
        </div>

        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>7 kunlik dinamika</div>
          <BarChart data={chartData} color={myTeam?.color || "#6366f1"} />
        </div>

        {!isWorker && (
          <div style={{ ...S.card, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>Komandalar reytingi</div>
            {teamKPI.map((t, i) => (
              <div key={t.id} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: "#cbd5e1" }}>
                    {i === 0 ? "1." : i === 1 ? "2." : i === 2 ? "3." : `${i + 1}.`} {t.name}
                  </span>
                  <span style={{ fontSize: 11, color: "#64748b" }}>
                    {t.qty} ta · {t.pts} ball · {Math.round(t.pct)}%
                  </span>
                </div>
                <MiniBar value={t.qty} max={t.target} color={t.color} />
              </div>
            ))}
          </div>
        )}

        <div style={S.card}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>Kategoriyalar</div>
          {catBreak.length === 0 && <div style={{ color: "#475569", textAlign: "center", padding: 12 }}>Ma'lumot yo'q</div>}
          {catBreak.map(c => (
            <div key={c.id} style={{ ...S.recRow, marginBottom: 8 }}>
              <span style={{ fontSize: 20 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: "#cbd5e1" }}>{c.name}</div>
                <MiniBar value={c.qty} max={catBreak[0]?.qty || 1} color="#6366f1" />
              </div>
              <div style={{ textAlign: "right", minWidth: 70 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{c.qty} ta</div>
                <div style={{ fontSize: 10, color: "#f59e0b" }}>{c.pts} ball</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<"login" | "admin" | "worker" | "stats">("login");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [db, setDb] = useState<DbData>(loadData);
  const [loginTeam, setLoginTeam] = useState(1);
  const [loginRole, setLoginRole] = useState<"worker" | "admin">("worker");
  const [adminPass, setAdminPass] = useState("");
  const [toast, setToast] = useState<ToastData | null>(null);

  useEffect(() => { saveData(db); }, [db]);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  function addRecord(rec: Record) {
    setDb((prev) => ({ ...prev, records: [...prev.records, rec] }));
  }

  function handleLogin() {
    if (loginRole === "admin") {
      if (adminPass === "admin123") {
        setCurrentUser({ role: "admin" });
        setView("admin");
      } else {
        showToast("Noto'g'ri parol!", "error");
      }
    } else {
      setCurrentUser({ role: "worker", teamId: loginTeam });
      setView("worker");
    }
  }

  function logout() {
    setCurrentUser(null);
    setView("login");
    setAdminPass("");
  }

  if (view === "login") return <LoginScreen
    teams={db.teams}
    loginTeam={loginTeam} setLoginTeam={setLoginTeam}
    loginRole={loginRole} setLoginRole={setLoginRole}
    adminPass={adminPass} setAdminPass={setAdminPass}
    onLogin={handleLogin} toast={toast}
  />;

  if (view === "worker" && currentUser) return <WorkerScreen
    team={db.teams.find(t => t.id === currentUser.teamId)!}
    categories={db.categories}
    records={db.records}
    onAdd={addRecord}
    onLogout={logout}
    onStats={() => setView("stats")}
    toast={toast}
    showToast={showToast}
  />;

  if (view === "admin") return <AdminScreen
    db={db} setDb={setDb}
    onLogout={logout}
    onStats={() => setView("stats")}
    toast={toast}
    showToast={showToast}
  />;

  if (view === "stats") return <StatsScreen
    db={db}
    onBack={() => setView(currentUser?.role === "admin" ? "admin" : "worker")}
    currentUser={currentUser}
    showToast={showToast}
    toast={toast}
  />;

  return null;
}
