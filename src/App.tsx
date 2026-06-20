import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Shield, Users, BarChart3, QrCode, Download, RefreshCw, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import * as XLSX from 'xlsx';

// Google Sheets API URL (Vercel yoki local muhitdan olinadi)
const GOOGLE_SHEETS_URL = import.meta.env.VITE_GOOGLE_SHEETS_URL || '';

interface ScannedItem {
  id: string;
  barcode: string;
  category: string;
  scannedBy: string;
  timestamp: string;
}

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [barcode, setBarcode] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'loading' | null; message: string }>({ type: null, message: '' });
  const [syncing, setSyncing] = useState(false);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // 1. Bazadan (Google Sheets) ma'lumotlarni yuklab olish
  const fetchScores = async () => {
    if (!GOOGLE_SHEETS_URL) return;
    try {
      const response = await fetch(GOOGLE_SHEETS_URL);
      if (response.ok) {
        const data = await response.json();
        setScannedItems(data);
      }
    } catch (error) {
      console.error("Ma'lumotlarni yuklashda xatolik:", error);
    }
  };

  useEffect(() => {
    fetchScores();
    const interval = setInterval(fetchScores, 10000); // Har 10 soniyada yangilab turadi
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedTeam && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [selectedTeam]);

  // 2. Shtrix-kodni sknerlaganda bazaga yuborish
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim() || !selectedTeam) return;

    const cleanBarcode = barcode.trim();
    
    // Kategoriyani aniqlash (Shtrix-kod uzunligi yoki prefiksiga qarab - o'zingizga moslang)
    let category = "Boshqa mahsulot";
    if (cleanBarcode.startsWith('A')) category = "A-Kategoriya";
    else if (cleanBarcode.startsWith('B')) category = "B-Kategoriya";

    const newItem: ScannedItem = {
      id: Math.random().toString(36).substring(2, 9),
      barcode: cleanBarcode,
      category: category,
      scannedBy: selectedTeam,
      timestamp: new Date().toLocaleString('uz-UZ'),
    };

    setStatus({ type: 'loading', message: 'Saqlanmoqda...' });

    // Agar Google Sheets URL bo'lsa, onlayn yuboradi
    if (GOOGLE_SHEETS_URL) {
      try {
        const response = await fetch(GOOGLE_SHEETS_URL, {
          method: 'POST',
          mode: 'no-cors', // Google Apps Script uchun muhim
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newItem)
        });
        
        // no-cors rejimida status har doim 0 bo'ladi, muvaffaqiyatli deb hisoblaymiz
        setScannedItems(prev => [newItem, ...prev]);
        setStatus({ type: 'success', message: `Shtrix-kod muvaffaqiyatli urildi: ${cleanBarcode}` });
        setBarcode('');
        fetchScores(); // Yangi ma'lumotlarni qayta o'qish
      } catch (error) {
        setStatus({ type: 'error', message: 'Internet xatoligi! Baza bilan aloqa yo\'q.' });
      }
    } else {
      // Agar ssilka topilmasa, vaqtincha ekranda ko'rsatib turadi
      setScannedItems(prev => [newItem, ...prev]);
      setStatus({ type: 'success', message: 'Lokal saqlandi (Baza ulanmagan!)' });
      setBarcode('');
    }

    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  };

  // Excel yuklab olish funksiyasi
  const downloadExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(scannedItems);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Markirovka_Hisobot");
    XLSX.writeFile(workbook, `Markirovka_Hisobot_${new Date().toLocaleDateString()}.xlsx`);
  };

  // Statistika hisob-kitoblari
  const teamStats = scannedItems.reduce((acc: any, item) => {
    acc[item.scannedBy] = (acc[item.scannedBy] || 0) + 1;
    return acc;
  }, {});

  const chartData = Object.keys(teamStats).map(key => ({
    name: key,
    sknerlangan: teamStats[key]
  }));

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 md:p-8">
      {/* HEADER */}
      <header className="max-w-6xl mx-auto flex justify-between items-center border-b border-slate-800 pb-6 mb-8">
        <div className="flex items-center gap-3">
          <QrCode className="w-8 h-8 text-blue-500" />
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Markirovka Nazorat Tizimi</h1>
        </div>
        <button 
          onClick={() => setIsAdmin(!isAdmin)}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <Shield className="w-4 h-4 text-blue-400" />
          {isAdmin ? "Skaner Bo'limi" : "Admin Panel"}
        </button>
      </header>

      <main className="max-w-6xl mx-auto">
        {/* SKANER REJIMi */}
        {!isAdmin ? (
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-400">
                <Users className="w-5 h-5" /> 1. Komandani tanlang
              </h2>
              <div className="space-y-2">
                {['Komanda A', 'Komanda B', 'Komanda C', 'Supervayzer'].map((team) => (
                  <button
                    key={team}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left p-4 rounded-xl font-medium border transition ${
                      selectedTeam === team 
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/30' 
                        : 'bg-slate-800/50 border-slate-750 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    {team}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-4 text-blue-400">2. Shtrix-kodni sknerlang</h2>
                <form onSubmit={handleBarcodeSubmit} className="space-y-4">
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    disabled={!selectedTeam}
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder={selectedTeam ? "Skanerlashni boshlang..." : "Avval komandani tanlang"}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-xl tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition"
                  />
                </form>

                {status.type && (
                  <div className={`mt-4 p-4 rounded-xl flex items-center gap-3 border ${
                    status.type === 'success' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-400' :
                    status.type === 'error' ? 'bg-rose-950/40 border-rose-800 text-rose-400' :
                    'bg-slate-900 border-slate-700 text-slate-400'
                  }`}>
                    {status.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
                    {status.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
                    {status.type === 'loading' && <RefreshCw className="w-5 h-5 animate-spin shrink-0" />}
                    <span className="text-sm font-medium">{status.message}</span>
                  </div>
                )}
              </div>

              <div className="mt-8 border-t border-slate-700 pt-4 text-xs text-slate-500 flex justify-between items-center">
                <span>Tanlangan: <strong className="text-slate-300">{selectedTeam || "Yo'q"}</strong></span>
                <span>Jami urilgan: <strong className="text-slate-300">{scannedItems.filter(i => i.scannedBy === selectedTeam).length} ta</strong></span>
              </div>
            </div>
          </div>
        ) : (
          /* ADMIN PANEL */
          <div className="space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 font-medium">Jami sknerlangan</p>
                  <h3 className="text-3xl font-bold mt-1">{scannedItems.length} ta</h3>
                </div>
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><QrCode className="w-6 h-6" /></div>
              </div>
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 font-medium">Faol Komandalar</p>
                  <h3 className="text-3xl font-bold mt-1">{Object.keys(teamStats).length} ta</h3>
                </div>
                <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl"><Users className="w-6 h-6" /></div>
              </div>
              <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400 font-medium">Eksport</p>
                  <button onClick={downloadExcel} className="mt-2 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-lg shadow-emerald-900/20">
                    <Download className="w-4 h-4" /> Excel yuklash
                  </button>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><BarChart3 className="w-6 h-6" /></div>
              </div>
            </div>

            {/* DIAGRAMMA */}
            <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
              <h3 className="text-lg font-semibold mb-6 text-slate-300">Komandalar ko'rsatkichi</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                    <Bar dataKey="sknerlangan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* JONLI JADVAL */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-slate-300">Oxirgi sknerlangan shtrix-kodlar</h3>
                <button onClick={fetchScores} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 transition"><RefreshCw className="w-4 h-4" /></button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 text-slate-400 text-sm font-semibold border-b border-slate-700">
                      <th className="p-4">Shtrix-kod</th>
                      <th className="p-4">Kategoriya</th>
                      <th className="p-4">Kim tomonidan</th>
                      <th className="p-4">Vaqti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50 text-sm">
                    {scannedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-750/30 transition text-slate-300">
                        <td className="p-4 font-mono tracking-wider font-semibold text-blue-400">{item.barcode}</td>
                        <td className="p-4"><span className="bg-slate-900 px-2.5 py-1 rounded-md border border-slate-700 text-xs">{item.category}</span></td>
                        <td className="p-4 font-medium">{item.scannedBy}</td>
                        <td className="p-4 text-slate-400 text-xs">{item.timestamp}</td>
                      </tr>
                    ))}
                    {scannedItems.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">Hozircha hech qanday ma'lumot yo'q</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
