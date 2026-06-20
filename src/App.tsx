import React, { useState, useEffect } from 'react';
import { Barcode, Server, Settings, Database, RefreshCw, User, ClipboardList, CheckCircle } from 'lucide-react';

// Google Forms integratsiyasi
const GOOGLE_FORM_SUBMIT_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScQuAM4Fq2vA_RejU6tIEGM7-cxa93TTOkd6vizfiziCY15qQ/formResponse';
// Ma'lumotlarni o'qish uchun Google Apps Script ssilkasi o'z joyida qoladi
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwZPl6bzpblC1FI4wUe-80yY6a8AI74Slox1kjAzgg26lfTIr1ywqvJ-rtxhQtOXPkZMw/exec';

interface ScannedItem {
  id: string;
  barcode: string;
  category: string;
  scannedBy: string;
  timestamp: string;
}

function App() {
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('Komanda A');
  const [scannedBy, setScannedBy] = useState('Skaner 1');
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', isError: false });

  // Google Sheets'dan ma'lumotlarni har 5 soniyada tortib olish
  const fetchItems = async () => {
    try {
      const response = await fetch(GOOGLE_SHEETS_URL);
      if (response.ok) {
        const data = await response.json();
        setItems(data.reverse()); // Eng yangi ma'lumotlar tepada ko'rinishi uchun
      }
    } catch (error) {
      console.error("Ma'lumot olishda xato:", error);
    }
  };

  useEffect(() => {
    fetchItems();
    const interval = setInterval(fetchItems, 5000);
    return () => clearInterval(interval);
  }, []);

  // Ma'lumotni Google Forms orqali xavfsiz yuborish
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setStatusMessage({ text: 'Yuborilmoqda...', isError: false });

    const itemId = Date.now().toString();
    const currentTimestamp = new Date().toLocaleString('ru-RU');

    // Google Forms formatidagi ma'lumot tuzilmasi
    const formData = new FormData();
    formData.append('entry.313014902', itemId);
    formData.append('entry.1747808269', barcode);
    formData.append('entry.817346141', category);
    formData.append('entry.1983056073', scannedBy);
    formData.append('entry.1472895697', currentTimestamp);

    try {
      // no-cors rejimi Google Forms xavfsizlik to'sig'idan osongina o'tadi
      await fetch(GOOGLE_FORM_SUBMIT_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: formData
      });

      setStatusMessage({ text: 'Muvaffaqiyatli saqlandi!', isError: false });
      setBarcode('');
      
      // Mahalliy ro'yxatni darhol yangilash
      const newItem: ScannedItem = {
        id: itemId,
        barcode: barcode,
        category: category,
        scannedBy: scannedBy,
        timestamp: currentTimestamp
      };
      setItems(prev => [newItem, ...prev]);

      // 3 soniyadan keyin statush xabarini o'chirish
      setTimeout(() => setStatusMessage({ text: '', isError: false }), 3000);
    } catch (error) {
      setStatusMessage({ text: 'Tizimda xato yuz berdi. Qayta urining.', isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-gradient-bg min-h-screen text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 px-4 py-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-200">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                Markirovka & TSD Tizimi
              </h1>
              <p className="text-xs text-slate-400 font-medium">Ombor Logistikasi Terminali</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-emerald-100">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Google Sheets Bog'langan</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Chap taraf: Skaner paneli */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center space-x-2 mb-6">
              <Server className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-800">TSD Terminali</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Skanerlovchi Shaxs / Qurilma
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <select
                    value={scannedBy}
                    onChange={(e) => setScannedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="Skaner 1">Skaner 1 (Asosiy)</option>
                    <option value="Skaner 2">Skaner 2 (Zaxira)</option>
                    <option value="Ombor Mudiri">Ombor Mudiri</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Ishchi Komanda / Kategoriya
                </label>
                <div className="relative">
                  <Settings className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                  >
                    <option value="Komanda A">Komanda A</option>
                    <option value="Komanda B">Komanda B</option>
                    <option value="Komanda C">Komanda C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Shtrix-kodni Kiriting
                </label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Skanerlang yoki qo'lda yozing..."
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold tracking-wider placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !barcode.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Ma'lumotni Saqlash</span>
                  </>
                )}
              </button>
            </form>

            {statusMessage.text && (
              <div className={`mt-4 p-3 rounded-xl text-center text-xs font-bold border transition-all ${
                statusMessage.isError 
                  ? 'bg-rose-50 text-rose-600 border-rose-100' 
                  : 'bg-emerald-50 text-emerald-700 border-emerald-100'
              }`}>
                {statusMessage.text}
              </div>
            )}
          </div>
        </div>

        {/* O'ng taraf: Jonli Monitor Paneli */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">Jonli Monitor paneli (Live)</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 flex items-center space-x-1 animate-pulse">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                <span>Har 5s yangilanadi</span>
              </span>
            </div>

            <div className="flex-1 overflow-x-auto">
              {items.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <ClipboardList className="w-8 h-8 mb-2 text-slate-300" />
                  <p className="text-sm font-medium">Hozircha skanerlangan ma'lumotlar yo'q</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">ID</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Shtrix-kod</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Kategoriya</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Skaner</th>
                      <th className="pb-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Vaqti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="py-3 text-xs font-mono text-slate-400">
                          {item.id ? `${item.id.slice(-5)}...` : '-'}
                        </td>
                        <td className="py-3 text-sm font-bold text-slate-700 tracking-wider">
                          {item.barcode}
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 text-xs font-semibold text-slate-500">
                          {item.scannedBy}
                        </td>
                        <td className="py-3 text-xs text-slate-400 font-medium">
                          {item.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
