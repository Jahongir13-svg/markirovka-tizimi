import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CLIENT CONFIGURATION ───────────────────────────────────────────
// O'zingizning Supabase loyihangizdagi URL va ANON_KEY kalitlarini qo'ying
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Record {
  id?: number;
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

// ─── INITIAL DATA FOR SEEDING ────────────────────────────────────────────────
const INITIAL_TEAMS: Team[] = [
  { id: 1, name: "1-Jamoa", color: "#3B82F6" },
  { id: 2, name: "2-Jamoa", color: "#10B981" },
  { id: 3, name: "3-Jamoa", color: "#F59E0B" },
  { id: 4, name: "4-Jamoa", color: "#EC4899" },
  { id: 5, name: "5-Jamoa", color: "#8B5CF6" },
];

const INITIAL_CATEGORIES: Category[] = [
  { id: "A", name: "Katta quti", points: 10, icon: "📦" },
  { id: "B", name: "O'rta quti", points: 5, icon: "📁" },
  { id: "C", name: "Kichik quti", points: 2, icon: "✉️" },
  { id: "D", name: "Pallet", points: 25, icon: "🏗️" },
];

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<"login" | "worker" | "admin">("login");
  const [currentUser, setCurrentUser] = useState<{ role: string; teamId?: number } | null>(null);

  const [records, setRecords] = useState<Record[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [loginTeam, setLoginTeam] = useState<number>(1);
  const [loginRole, setLoginRole] = useState<string>("worker");
  const [adminPass, setAdminPass] = useState<string>("");
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  // Worker Form State
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [artikul, setArtikul] = useState<string>("");
  const [barcode, setBarcode] = useState<string>("");

  // 1. SUPABASE BAZADAN MA'LUMOTLARNI YUKLASH
  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setLoading(true);
    try {
      // Teams
      let { data: tData, error: tErr } = await supabase.from("teams").select("*");
      if (tErr) throw tErr;
      if (!tData || tData.length === 0) {
        await supabase.from("teams").insert(INITIAL_TEAMS);
        tData = INITIAL_TEAMS;
      }
      setTeams(tData);

      // Categories
      let { data: cData, error: cErr } = await supabase.from("categories").select("*");
      if (cErr) throw cErr;
      if (!cData || cData.length === 0) {
        await supabase.from("categories").insert(INITIAL_CATEGORIES);
        cData = INITIAL_CATEGORIES;
      }
      setCategories(cData);

      // Records
      const { data: rData, error: rErr } = await supabase
        .from("records")
        .select("*")
        .order("id", { ascending: false });
      if (rErr) throw rErr;
      setRecords(rData || []);
    } catch (err: any) {
      showToast("Ma'lumotlarni yuklashda xatolik: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string, type: string = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // LOGIN LOGIKASI
  function handleLogin() {
    if (loginRole === "admin") {
      if (adminPass === "1234") {
        setCurrentUser({ role: "admin" });
        setView("admin");
        showToast("Xush kelibsiz, Admin!");
      } else {
        showToast("Parol noto'g'ri!", "error");
      }
    } else {
      setCurrentUser({ role: "worker", teamId: loginTeam });
      setView("worker");
      showToast(`${loginTeam}-Jamoa ishchi paneli`);
    }
  }

  // YANGI YOZUV QO'SHISH (Supabase Sync)
  async function handleAddRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!currentUser || currentUser.role !== "worker" || !currentUser.teamId) return;
    if (!selectedCategory) {
      showToast("Kategoriyani tanlang!", "error");
      return;
    }

    const cat = categories.find((c) => c.id === selectedCategory);
    const team = teams.find((t) => t.id === currentUser.teamId);
    if (!cat || !team) return;

    const totalPoints = cat.points * qty;
    const now = new Date();

    const newRec: Omit<Record, "id"> = {
      teamId: team.id,
      teamName: team.name,
      date: now.toISOString().split("T")[0],
      ts: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      qty,
      categoryId: cat.id,
      categoryName: cat.name,
      points: totalPoints,
      barcode: barcode || null,
      artikul: artikul || "-",
    };

    try {
      const { data, error } = await supabase.from("records").insert([newRec]).select();
      if (error) throw error;

      if (data && data.length > 0) {
        setRecords((prev) => [data[0], ...prev]);
        showToast("Ish muvaffaqiyatli saqlandi!");
        setQty(1);
        setArtikul("");
        setBarcode("");
      }
    } catch (err: any) {
      showToast("Saqlashda xatolik: " + err.message, "error");
    }
  }

  // YOZUVNI O'CHIRISH (Admin uchun)
  async function handleDeleteRecord(id?: number) {
    if (!id) return;
    try {
      const { error } = await supabase.from("records").delete().eq("id", id);
      if (error) throw error;

      setRecords((prev) => prev.filter((r) => r.id !== id));
      showToast("Yozuv o'chirildi");
    } catch (err: any) {
      showToast("O'chirishda xatolik: " + err.message, "error");
    }
  }

  // EXCELGA EXPORT QILISH
  function exportToExcel() {
    const ws = XLSX.utils.json_to_sheet(records);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Hisobot");
    XLSX.writeFile(wb, `Hisobot_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <h2>Ma'lumotlar yuklanmoqda...</h2>
      </div>
    );
  }

  return (
    <div style={styles.appContainer}>
      {toast && (
        <div style={{ ...styles.toast, backgroundColor: toast.type === "error" ? "#EF4444" : "#10B981" }}>
          {toast.msg}
        </div>
      )}

      {/* ─── LOGIN SCREEN ─── */}
      {view === "login" && (
        <div style={styles.card}>
          <h2 style={{ textAlign: "center", marginBottom: 20 }}>Tizimga kirish</h2>
          <div style={styles.formGroup}>
            <label>Rolni tanlang:</label>
            <select value={loginRole} onChange={(e) => setLoginRole(e.target.value)} style={styles.input}>
              <option value="worker">Ishchi (Jamoa)</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          {loginRole === "worker" ? (
            <div style={styles.formGroup}>
              <label>Jamoani tanlang:</label>
              <select value={loginTeam} onChange={(e) => setLoginTeam(Number(e.target.value))} style={styles.input}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div style={styles.formGroup}>
              <label>Admin Parol:</label>
              <input
                type="password"
                value={adminPass}
                onChange={(e) => setAdminPass(e.target.value)}
                placeholder="Parol kiritish"
                style={styles.input}
              />
            </div>
          )}

          <button onClick={handleLogin} style={styles.primaryBtn}>
            Kirish
          </button>
        </div>
      )}

      {/* ─── WORKER SCREEN ─── */}
      {view === "worker" && (
        <div>
          <div style={styles.header}>
            <h3>
              {teams.find((t) => t.id === currentUser?.teamId)?.name} — Bajarilgan ishni kiritish
            </h3>
            <button onClick={() => setView("login")} style={styles.dangerBtn}>
              Chiqish
            </button>
          </div>

          <form onSubmit={handleAddRecord} style={styles.card}>
            <div style={styles.formGroup}>
              <label>Kategoriya:</label>
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} style={styles.input}>
                <option value="">-- Tanlang --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name} ({c.points} ball)
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label>Soni (Sht):</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Artikul (ixtiyoriy):</label>
              <input
                type="text"
                value={artikul}
                onChange={(e) => setArtikul(e.target.value)}
                placeholder="Masalan: A-123"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Shtrix-kod / Shtrix (ixtiyoriy):</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Shtrix-kodni skanerlang"
                style={styles.input}
              />
            </div>

            <button type="submit" style={styles.primaryBtn}>
              Saqlash va Yuborish
            </button>
          </form>

          <h4 style={{ marginTop: 20 }}>Siz kiritgan so'nggi yozuvlar:</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Vaqt</th>
                <th>Kategoriya</th>
                <th>Soni</th>
                <th>Ball</th>
                <th>Artikul</th>
              </tr>
            </thead>
            <tbody>
              {records
                .filter((r) => r.teamId === currentUser?.teamId)
                .slice(0, 5)
                .map((r, i) => (
                  <tr key={i}>
                    <td>{r.ts}</td>
                    <td>{r.categoryName}</td>
                    <td>{r.qty}</td>
                    <td>{r.points}</td>
                    <td>{r.artikul}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── ADMIN SCREEN ─── */}
      {view === "admin" && (
        <div>
          <div style={styles.header}>
            <h3>Admin Panel — Umumiy Boshqaruv</h3>
            <div>
              <button onClick={exportToExcel} style={styles.successBtn}>
                Excelga Yuklash (.xlsx)
              </button>
              <button onClick={() => setView("login")} style={{ ...styles.dangerBtn, marginLeft: 10 }}>
                Chiqish
              </button>
            </div>
          </div>

          <div style={styles.card}>
            <h4>Jamoalar Ballari:</h4>
            <ul>
              {teams.map((t) => {
                const total = records
                  .filter((r) => r.teamId === t.id)
                  .reduce((acc, curr) => acc + curr.points, 0);
                return (
                  <li key={t.id} style={{ fontSize: 16, margin: "5px 0" }}>
                    <strong>{t.name}:</strong> {total} ball
                  </li>
                );
              })}
            </ul>
          </div>

          <h4>Barcha Kiritilgan Yozuvlar Baza:</h4>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Jamoa</th>
                <th>Sana/Vaqt</th>
                <th>Kategoriya</th>
                <th>Soni</th>
                <th>Ball</th>
                <th>Artikul</th>
                <th>Shtrix-kod</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.teamName}</td>
                  <td>{r.date} {r.ts}</td>
                  <td>{r.categoryName}</td>
                  <td>{r.qty}</td>
                  <td>{r.points}</td>
                  <td>{r.artikul}</td>
                  <td>{r.barcode || "-"}</td>
                  <td>
                    <button onClick={() => handleDeleteRecord(r.id)} style={styles.dangerBtnSmall}>
                      O'chirish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── SIMPLE STYLES ───────────────────────────────────────────────────────────
const styles: { [key: string]: React.CSSProperties } = {
  appContainer: { maxWidth: 800, margin: "0 auto", padding: 20, fontFamily: "sans-serif" },
  centerContainer: { display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" },
  card: { backgroundColor: "#f9fafb", padding: 20, borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 20 },
  formGroup: { marginBottom: 15 },
  input: { width: "100%", padding: "10px", marginTop: 5, borderRadius: 4, border: "1px solid #ccc", boxSizing: "border-box" },
  primaryBtn: { width: "100%", backgroundColor: "#2563EB", color: "#fff", padding: 12, border: "none", borderRadius: 4, cursor: "pointer" },
  dangerBtn: { backgroundColor: "#EF4444", color: "#fff", padding: "8px 16px", border: "none", borderRadius: 4, cursor: "pointer" },
  dangerBtnSmall: { backgroundColor: "#EF4444", color: "#fff", padding: "4px 8px", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 },
  successBtn: { backgroundColor: "#10B981", color: "#fff", padding: "8px 16px", border: "none", borderRadius: 4, cursor: "pointer" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  toast: { position: "fixed", top: 20, right: 20, color: "#fff", padding: "10px 20px", borderRadius: 5, zIndex: 1000 },
  table: { width: "100%", borderCollapse: "collapse", marginTop: 10 },
};
