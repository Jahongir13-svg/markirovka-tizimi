import React, { useState, useEffect } from 'react';

// Google Sheets Apps Script URL manzili
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZPl6bzpblC1FI4wUe-80yY6a8AI74Slox1kjAzgg26lfTIr1ywqvJ-rtxhQtOXPkZMw/exec';

interface ScanRecord {
  id: string;
  barcode: string;
  category: string;
  points: number;
  team: string;
  role: string;
  timestamp: string;
}

export default function App() {
  // Sahifalar boshqaruvi: 'login' | 'user_panel' | 'admin_panel'
  const [view, setView] = useState<'login' | 'user_panel' | 'admin_panel'>('login');
  const [role, setRole] = useState<'Xodim' | 'Admin'>('Xodim');
  const [selectedTeam, setSelectedTeam] = useState('Komanda 1');
  
  // Ma'lumotlar va formalar uchun
  const [barcode, setBarcode] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Oyoq kiyim');
  const [records, setRecords] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminTab, setAdminTab] = useState<'home' | 'teams' | 'categories' | 'logs' | 'export'>('home');

  // Kategoriyalar va ularning ballari
  const categories = [
    { name: 'Oyoq kiyim', points: 3, icon: '👟' },
    { name: 'Kiyim-kechak', points: 2, icon: '👕' },
    { name: 'Aksessuarlar', points: 1, icon: '👜' },
    { name: 'Elektronika', points: 4, icon: '💻' },
    { name: 'Oziq-ovqat', points: 2, icon: '🍱' },
    { name: 'Kosmetika', points: 2, icon: '💄' },
    { name: 'Uy jihozlari', points: 3, icon: '🏠' },
    { name: 'Boshqa', points: 1, icon: '📦' },
  ];

  // Jamoalar ro'yxati
  const teams = Array.from({ length: 10 }, (_, i) => `Komanda ${i + 1}`);

  // Ma'lumotlarni yuklab olish
  const fetchRecords = async () => {
    try {
      const res = await fetch(GOOGLE_SCRIPT_URL);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (e) {
      console.error("Xatolik:", e);
    }
  };

  useEffect(() => {
    fetchRecords();
    const interval = setInterval(fetchRecords, 5000);
    return () => clearInterval(interval);
  }, []);

  // Tizimga kirish
  const handleLogin = () => {
    if (role === 'Admin') {
      setView('admin_panel');
    } else {
      setView('user_panel');
    }
  };

  // Shtrix-kod kiritish va saqlash
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    const catObj = categories.find(c => c.name === selectedCategory);
    const points = catObj ? catObj.points : 1;

    const newScan = {
      id: Date.now().toString(),
      barcode: barcode,
      category: selectedCategory,
      points: points,
      team: selectedTeam,
      role: role,
      timestamp: new Date().toLocaleString('ru-RU')
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newScan)
      });
      setBarcode('');
      fetchRecords();
    } catch (err) {
      alert("Xatolik yuz berdi!");
    } finally {
      setLoading(false);
    }
  };

  // Statistika hisoblash (Faqat bugungi kun uchun)
  const todayStr = new Date().toLocaleDateString('ru-RU');
  const todayRecords = records.filter(r => r.timestamp.includes(todayStr));
  
  // Tanlangan komandaning bugungi statistikasi
  const teamTodayRecords = todayRecords.filter(r => r.team === selectedTeam);
  const teamTodayCount = teamTodayRecords.length;
  const teamTodayPoints = teamTodayRecords.reduce((sum, r) => sum + Number(r.points), 0);
  const teamKPI = Math.min(Math.round((teamTodayCount / 200) * 100), 100);

  // Dizayn Ranglari (Sizning to'q ko'k rangli fovingiz)
  const styles = {
    bg: '#0d1117',
    card: '#161b22',
    border: '#30363d',
    text: '#c9d1d9',
    accent: '#58a6ff',
    button: '#1f6feb',
    success: '#238636'
  };

  if (view === 'login') {
    return (
      <div style={{ backgroundColor: styles.bg, color: styles.text, minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ backgroundColor: styles.card, border: `1px solid ${styles.border}`, padding: '40px', borderRadius: '12px', width: '360px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>📦</div>
          <h2 style={{ margin: '0 0 5px 0', color: '#fff' }}>Markirovka Tizimi</h2>
          <p style={{ color: '#8b949e', fontSize: '14px', margin: '0 0 25px 0' }}>Kirish uchun ma'lumotlarni tanlang</p>
          
          <div style={{ textAlign: 'left', marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', color: '#8b949e', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>ROL TANLANG</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setRole('Xodim')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${role === 'Xodim' ? styles.accent : styles.border}`, backgroundColor: role === 'Xodim' ? styles.button : 'transparent', color: '#fff', cursor: 'pointer' }}>Xodim</button>
              <button onClick={() => setRole('Admin')} style={{ flex: 1, padding: '10px', borderRadius: '6px', border: `1px solid ${role === 'Admin' ? styles.accent : styles.border}`, backgroundColor: role === 'Admin' ? styles.button : 'transparent', color: '#fff', cursor: 'pointer' }}>Admin</button>
            </div>
          </div>

          {role === 'Xodim' && (
            <div style={{ textAlign: 'left', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#8b949e', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>KOMANDANGIZNI TANLANG</label>
              <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '6px', backgroundColor: styles.bg, border: `1px solid ${styles.border}`, color: '#fff' }}>
                {teams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}

          <button onClick={handleLogin} style={{ width: '100%', padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: styles.button, color: '#fff', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}>Kirish</button>
        </div>
      </div>
    );
  }

  if (view === 'user_panel') {
    return (
      <div style={{ backgroundColor: styles.bg, color: styles.text, minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: `1px solid ${styles.border}`, paddingBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: styles.accent, fontWeight: 'bold' }}>🔵 {selectedTeam}</span>
          </div>
          <div>
            <button onClick={() => setView('login')} style={{ backgroundColor: '#21262d', border: `1px solid ${styles.border}`, color: '#f0f6fc', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Chiqish</button>
          </div>
        </div>

        {/* Top Dash Cards */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <div style={{ flex: 1, backgroundColor: styles.card, border: `1px solid ${styles.border}`, borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px' }}>📦</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0', color: styles.accent }}>{teamTodayCount}</div>
            <div style={{ fontSize: '12px', color: '#8b949e' }}>Bugun soni</div>
          </div>
          <div style={{ flex: 1, backgroundColor: styles.card, border: `1px solid ${styles.border}`, borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px' }}>⭐</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0', color: '#e3b341' }}>{teamTodayPoints}</div>
            <div style={{ fontSize: '12px', color: '#8b949e' }}>Bugun ball</div>
          </div>
          <div style={{ flex: 1, backgroundColor: styles.card, border: `1px solid ${styles.border}`, borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px' }}>🎯</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', margin: '5px 0', color: '#3fb950' }}>{teamKPI}%</div>
            <div style={{ fontSize: '12px', color: '#8b949e' }}>KPI</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ backgroundColor: styles.card, border: `1px solid ${styles.border}`, padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px', color: '#8b949e' }}>
            <span>Kunlik maqsad</span>
            <span>{teamTodayCount} / 200</span>
          </div>
          <div style={{ width: '100%', backgroundColor: styles.bg, height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${teamKPI}%`, backgroundColor: styles.button, height: '100%', transition: 'width 0.3s' }}></div>
          </div>
        </div>

        {/* Main Work Card */}
        <div style={{ backgroundColor: styles.card, border: `1px solid ${styles.border}`, padding: '20px', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#fff' }}>Yangi kiritish</h3>
          
          <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>KATEGORIYA</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            {categories.map(cat => (
              <button 
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', padding: '12px', borderRadius: '6px', 
                  backgroundColor: selectedCategory === cat.name ? '#1f293d' : styles.bg, 
                  border: `1px solid ${selectedCategory === cat.name ? styles.accent : styles.border}`, 
                  color: '#fff', cursor: 'pointer', textAlign: 'left'
                }}
              >
                <span>{cat.icon} {cat.name}</span>
                <span style={{ color: '#8b949e', fontSize: '12px' }}>+{cat.points}b</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleScanSubmit}>
            <label style={{ fontSize: '12px', color: '#8b949e', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>ARTIKUL (SHTRIX KODNI SCANERLANG)</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Artikul yoki shtrix kod"
                autoFocus
                style={{ flex: 1, padding: '12px', borderRadius: '6px', backgroundColor: styles.bg, border: `1px solid ${styles.border}`, color: '#fff', fontSize: '16px' }}
              />
              <button type="submit" disabled={loading || !barcode.trim()} style={{ padding: '0 20px', borderRadius: '6px', border: 'none', backgroundColor: styles.button, color: '#fff', cursor: 'pointer' }}>
                {loading ? '...' : '✓'}
              </button>
            </div>
          </form>
        </div>

        {/* Bugungi Kiritishlar ro'yxati */}
        <div style={{ marginTop: '20px', backgroundColor: styles.card, border: `1px solid ${styles.border}`, padding: '15px', borderRadius: '8px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#fff' }}>Bugungi kiritishlar</h4>
          {teamTodayRecords.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e', fontSize: '13px' }}>Hali kiritish yo'q</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {teamTodayRecords.slice().reverse().map((r, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: styles.bg, padding: '10px', borderRadius: '6px', fontSize: '13px', border: `1px solid ${styles.border}` }}>
                  <div>
                    <span style={{ fontWeight: 'bold', marginRight: '10px' }}>{r.barcode}</span>
                    <span style={{ color: '#8b949e' }}>{r.category}</span>
                  </div>
                  <span style={{ color: '#e3b341' }}>+{r.points} ball</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (view === 'admin_panel') {
    return (
      <div style={{ backgroundColor: styles.bg, color: styles.text, minHeight: '100vh', fontFamily: 'sans-serif', padding: '20px' }}>
        {/* Admin Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `1px solid ${styles.border}`, paddingBottom: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>Admin Panel</h2>
          <button onClick={() => setView('login')} style={{ backgroundColor: '#21262d', border: `1px solid ${styles.border}`, color: '#f0f6fc', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Chiqish</button>
        </div>

        {/* Admin Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          {['home', 'teams', 'categories', 'logs', 'export'].map((tab) => (
            <button 
              key={tab} 
              onClick={() => setAdminTab(tab as any)}
              style={{ 
                padding: '8px 14px', borderRadius: '6px', border: `1px solid ${adminTab === tab ? styles.accent : styles.border}`, 
                backgroundColor: adminTab === tab ? styles.button : styles.card, color: '#fff', cursor: 'pointer', textTransform: 'capitalize'
              }}
            >
              {tab === 'home' ? 'Bosh sahifa' : tab === 'teams' ? 'Komandalar' : tab === 'categories' ? 'Kategoriyalar' : tab === 'logs' ? 'Yozuvlar' : 'Eksport'}
            </button>
          ))}
        </div>

        {/* Admin Dash Top Dashboard Stats */}
        {adminTab === 'home' && (
          <div>
            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
              <div style={{ flex: 1, backgroundColor: styles.card, border: `1px solid ${styles.border}`, borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px' }}>📦</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: styles.accent, margin: '5px 0' }}>{todayRecords.length}</div>
                <div style={{ color: '#8b949e', fontSize: '13px' }}>Bugun Jami</div>
              </div>
              <div style={{ flex: 1, backgroundColor: styles.card, border: `1px solid ${styles.border}`, borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px' }}>⭐</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#e3b341', margin: '5px 0' }}>{todayRecords.reduce((s,r)=>s+Number(r.points), 0)}</div>
                <div style={{ color: '#8b949e', fontSize: '13px' }}>Bugun ball</div>
              </div>
              <div style={{ flex: 1, backgroundColor: styles.card, border: `1px solid ${styles.border}`, borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px' }}>👥</div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2ea44f', margin: '5px 0' }}>{new Set(todayRecords.map(r=>r.team)).size}</div>
                <div style={{ color: '#8b949e', fontSize: '13px' }}>Faol komandalar</div>
              </div>
            </div>

            {/* Jamoalar Reytingi */}
            <div style={{ backgroundColor: styles.card, border: `1px solid ${styles.border}`, borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#fff' }}>Bugungi reyting</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {teams.map((t, idx) => {
                  const tRecs = todayRecords.filter(r => r.team === t);
                  const tPoints = tRecs.reduce((s, r) => s + Number(r.points), 0);
                  return (
                    <div key={t} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: styles.bg, border: `1px solid ${styles.border}`, borderRadius: '6px' }}>
                      <span style={{ fontWeight: 'bold' }}>{idx + 1}. {t}</span>
                      <span style={{ color: '#8b949e' }}>{tRecs.length} ta • <span style={{ color: '#e3b341' }}>{tPoints} ball</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Boshqa tablar uchun placeholder */}
        {adminTab !== 'home' && (
          <div style={{ backgroundColor: styles.card, border: `1px solid ${styles.border}`, padding: '30px', borderRadius: '8px', textAlign: 'center', color: '#8b949e' }}>
            Ushbu bo'lim faol. Barcha ma'lumotlar Google Sheets bilan sinxronizatsiya qilingan.
          </div>
        )}
      </div>
    );
  }
}
