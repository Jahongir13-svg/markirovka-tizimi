import React, { useState, useEffect } from 'react';

// Faqatgina bitta toza Google Sheets Web App manzili (Forms-siz)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZPl6bzpblC1FI4wUe-80yY6a8AI74Slox1kjAzgg26lfTIr1ywqvJ-rtxhQtOXPkZMw/exec';

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
  const [message, setMessage] = useState('');

  // Bloklash / Kodlash funksiyasi
  const [isLocked, setIsLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [inputPassword, setInputPassword] = useState('');

  // Bazadan ma'lumotlarni o'qib olish
  const fetchItems = async () => {
    try {
      const response = await fetch(GOOGLE_SCRIPT_URL);
      if (response.ok) {
        const data = await response.json();
        setItems(data);
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

  // Ma'lumotni to'g'ridan-to'g'ri bazaga yozish (Eski, eng toza usul)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) return;

    setLoading(true);
    setMessage('Yuborilmoqda...');

    const newItem = {
      id: Date.now().toString(),
      barcode: barcode,
      category: category,
      scannedBy: scannedBy,
      timestamp: new Date().toLocaleString('ru-RU')
    };

    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem)
      });

      setMessage('Muvaffaqiyatli saqlandi!');
      setBarcode('');
      fetchItems();
    } catch (error) {
      setMessage('Xatolik yuz berdi, qayta urining.');
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleLock = () => {
    if (password.trim() === '') {
      alert("Iltimos, oldin parol o'rnating!");
      return;
    }
    setIsLocked(true);
  };

  const handleUnlock = () => {
    if (inputPassword === password) {
      setIsLocked(false);
      setInputPassword('');
    } else {
      alert("Parol noto'g'ri!");
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto', backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <h2 style={{ color: '#333' }}>Markirovka Tizimi (TSD Terminali)</h2>
      
      {/* Bloklash paneli */}
      <div style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '5px', marginBottom: '20px', backgroundColor: '#f9f9f9' }}>
        <h3>Kataklarni himoyalash (Bloklash)</h3>
        {!isLocked ? (
          <div>
            <input 
              type="password" 
              placeholder="Parol o'rnating" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button onClick={handleLock} style={{ padding: '8px 15px', backgroundColor: '#e0a800', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
              Bloklashni yoqish
            </button>
          </div>
        ) : (
          <div>
            <span style={{ color: 'red', fontWeight: 'bold', marginRight: '10px' }}>🔒 Tizim bloklangan!</span>
            <input 
              type="password" 
              placeholder="Ochish uchun parolni kiriting" 
              value={inputPassword} 
              onChange={(e) => setInputPassword(e.target.value)}
              style={{ padding: '8px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button onClick={handleUnlock} style={{ padding: '8px 15px', backgroundColor: '#218838', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>
              Blokdan chiqarish
            </button>
          </div>
        )}
      </div>

      {/* Skanerlash shakli */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Skanerlovchi:</label>
          <select 
            value={scannedBy} 
            onChange={(e) => setScannedBy(e.target.value)}
            disabled={isLocked}
            style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="Skaner 1">Skaner 1</option>
            <option value="Skaner 2">Skaner 2</option>
            <option value="Ombor Mudiri">Ombor Mudiri</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Kategoriya:</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            disabled={isLocked}
            style={{ padding: '10px', width: '100%', borderRadius: '4px', border: '1px solid #ccc' }}
          >
            <option value="Komanda A">Komanda A</option>
            <option value="Komanda B">Komanda B</option>
            <option value="Komanda C">Komanda C</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Shtrix-kod:</label>
          <input 
            type="text" 
            value={barcode} 
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Shtrix-kodni skanerlang..."
            disabled={isLocked}
            autoFocus
            style={{ padding: '12px', width: '100%', boxSizing: 'border-box', fontSize: '16px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading || isLocked || !barcode.trim()}
          style={{ padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer' }}
        >
          {loading ? 'Saqlanmoqda...' : 'Ma\'lumotni saqlash'}
        </button>
      </form>

      {message && <div style={{ padding: '10px', backgroundColor: '#e2f0d9', color: '#385723', textAlign: 'center', marginBottom: '20px', borderRadius: '4px', fontWeight: 'bold' }}>{message}</div>}

      {/* Monitoring jadvali */}
      <h3>Skanerlangan ma'lumotlar monitoringi:</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', backgroundColor: '#fff' }}>
        <thead>
          <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left', color: '#333' }}>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>ID</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Shtrix-kod</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Kategoriya</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Skaner</th>
            <th style={{ border: '1px solid #ddd', padding: '8px' }}>Vaqti</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '10px', color: '#777' }}>Hozircha ma'lumot yo'q</td>
            </tr>
          ) : (
            items.slice().reverse().map((item, index) => (
              <tr key={index} style={{ color: '#333' }}>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.id}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px', fontWeight: 'bold' }}>{item.barcode}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.category}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.scannedBy}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{item.timestamp}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default App;
