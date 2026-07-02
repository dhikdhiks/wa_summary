'use client';

import { useState, useEffect, FormEvent } from 'react';

interface Catatan {
  _id: string;
  Tanggal: string;
  Pesan: string;
}

export default function Home() {
  const [mode, setMode] = useState<'tambah' | 'ringkas'>('tambah');
  const [tanggal, setTanggal] = useState('');
  const [pesan, setPesan] = useState('');
  const [simpanLoading, setSimpanLoading] = useState(false);
  const [simpanMessage, setSimpanMessage] = useState('');

  const [dataCatatan, setDataCatatan] = useState<Catatan[]>([]);
  const [filterMulai, setFilterMulai] = useState('');
  const [filterSampai, setFilterSampai] = useState('');
  const [combinedText, setCombinedText] = useState(''); // hasil gabungan
  const [ringkasan, setRingkasan] = useState('');
  const [ringkasanLoading, setRingkasanLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState('');

  useEffect(() => {
    if (mode === 'ringkas') {
      fetchData();
    }
  }, [mode, filterMulai, filterSampai]);

  const fetchData = async () => {
    setFetchLoading(true);
    setCombinedText(''); // reset gabungan saat filter berubah
    try {
      const params = new URLSearchParams();
      if (filterMulai) params.append('mulai', filterMulai);
      if (filterSampai) params.append('sampai', filterSampai);
      const res = await fetch(`/api/messages?${params.toString()}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gagal memuat: ${res.status} - ${errText}`);
      }
      const json = await res.json();
      setDataCatatan(json);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFetchLoading(false);
    }
  };

  // Gabungkan semua pesan yang tampil menjadi satu teks
  const handleCombine = () => {
    if (dataCatatan.length === 0) {
      alert('Tidak ada data untuk digabungkan');
      return;
    }
    const combined = dataCatatan
      .map((item) => {
        const tgl = new Date(item.Tanggal).toLocaleDateString('id-ID');
        return `[${tgl}] ${item.Pesan}`;
      })
      .join('\n\n');
    setCombinedText(combined);
  };

  const handleSimpan = async (e: FormEvent) => {
    e.preventDefault();
    setSimpanLoading(true);
    setSimpanMessage('');
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tanggal, pesan }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan');
      }
      setTanggal('');
      setPesan('');
      setSimpanMessage('✅ Catatan berhasil disimpan!');
    } catch (error: any) {
      setSimpanMessage(`❌ ${error.message}`);
    } finally {
      setSimpanLoading(false);
    }
  };

  const handleHapus = async (id: string) => {
    if (!confirm('Yakin ingin menghapus catatan ini?')) return;
    setDeleteMessage('');
    try {
      const res = await fetch(`/api/messages?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal menghapus');
      setDeleteMessage('✅ Catatan dihapus');
      fetchData();
    } catch (error: any) {
      setDeleteMessage(`❌ ${error.message}`);
    }
  };

  // Kirim teks gabungan ke API
  const handleRingkasan = async () => {
    if (!combinedText) {
      alert('Gabungkan data terlebih dahulu sebelum membuat ringkasan.');
      return;
    }
    setRingkasanLoading(true);
    setRingkasan('');

    // Cache key berdasarkan teks (hash sederhana)
    const cacheKey = `summary_${btoa(combinedText).slice(0, 50)}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setRingkasan(cached);
      setRingkasanLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: combinedText }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream tidak tersedia');
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setRingkasan((prev) => prev + chunk);
      }

      localStorage.setItem(cacheKey, fullText);
    } catch (error: any) {
      setRingkasan(`❌ ${error.message}`);
    } finally {
      setRingkasanLoading(false);
    }
  };

  const handleExport = () => {
    if (dataCatatan.length === 0) return alert('Tidak ada data');
    const teks = dataCatatan
      .map((item) => `[${new Date(item.Tanggal).toISOString().slice(0, 10)}] ${item.Pesan}`)
      .join('\n');
    const blob = new Blob([teks], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'catatan.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle = {
    padding: '0.75rem',
    fontSize: '16px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  };

  return (
    <main style={{ maxWidth: 800, margin: '2rem auto', padding: '0 1rem' }}>
      <h1 style={{ textAlign: 'center', color: '#2e7d32', marginBottom: '1.5rem' }}>
        📒 Catatan Harian & Ringkasan AI
      </h1>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
        <button
          onClick={() => setMode('tambah')}
          style={{
            padding: '0.7rem 1.5rem',
            background: mode === 'tambah' ? '#2e7d32' : '#f0f0f0',
            color: mode === 'tambah' ? 'white' : '#333',
            border: 'none',
            borderRadius: 8,
            fontWeight: 'bold',
            fontSize: 16,
          }}
        >
          ✏️ Tambah Catatan
        </button>
        <button
          onClick={() => setMode('ringkas')}
          style={{
            padding: '0.7rem 1.5rem',
            background: mode === 'ringkas' ? '#2e7d32' : '#f0f0f0',
            color: mode === 'ringkas' ? 'white' : '#333',
            border: 'none',
            borderRadius: 8,
            fontWeight: 'bold',
            fontSize: 16,
          }}
        >
          📋 Lihat & Ringkas
        </button>
      </div>

      {mode === 'tambah' && (
        <div
          style={{
            background: 'white',
            padding: '2rem',
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          <h2 style={{ color: '#2e7d32', marginTop: 0 }}>Tambah Catatan Baru</h2>
          <form onSubmit={handleSimpan}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  color: '#1a1a1a',
                }}
              >
                Tanggal
              </label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label
                style={{
                  display: 'block',
                  fontWeight: 600,
                  marginBottom: '0.5rem',
                  color: '#1a1a1a',
                }}
              >
                Materi / Pesan
              </label>
              <textarea
                value={pesan}
                onChange={(e) => setPesan(e.target.value)}
                placeholder="Tulis materi atau pesan di sini..."
                rows={6}
                required
                style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>
            <button
              type="submit"
              disabled={simpanLoading}
              style={{
                padding: '0.8rem 2rem',
                background: simpanLoading ? '#a5d6a7' : '#2e7d32',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontWeight: 'bold',
                fontSize: 16,
                cursor: simpanLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {simpanLoading ? 'Menyimpan...' : '💾 Simpan'}
            </button>
            {simpanMessage && (
              <p style={{ marginTop: '1rem', color: simpanMessage.startsWith('✅') ? '#2e7d32' : 'red' }}>
                {simpanMessage}
              </p>
            )}
          </form>
        </div>
      )}

      {mode === 'ringkas' && (
        <div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontWeight: 600, marginRight: 4 }}>Dari:</label>
              <input
                type="date"
                value={filterMulai}
                onChange={(e) => setFilterMulai(e.target.value)}
                style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ fontWeight: 600, marginRight: 4 }}>Sampai:</label>
              <input
                type="date"
                value={filterSampai}
                onChange={(e) => setFilterSampai(e.target.value)}
                style={{ padding: '0.4rem', border: '1px solid #ccc', borderRadius: 4 }}
              />
            </div>
            <button
              onClick={fetchData}
              style={{
                padding: '0.4rem 1rem',
                background: '#e0e0e0',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
              }}
            >
              🔄 Terapkan
            </button>
          </div>

          {fetchLoading ? (
            <p>Memuat data...</p>
          ) : dataCatatan.length === 0 ? (
            <p style={{ color: '#555' }}>Belum ada catatan dengan filter tersebut.</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ color: '#1a1a1a' }}>{dataCatatan.length} catatan</h3>
                <button
                  onClick={handleExport}
                  style={{
                    padding: '0.4rem 1rem',
                    background: '#f5f5f5',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    fontWeight: 600,
                  }}
                >
                  📥 Ekspor TXT
                </button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {dataCatatan.map((item) => (
                  <li
                    key={item._id}
                    style={{
                      background: 'white',
                      marginBottom: '0.5rem',
                      padding: '0.8rem',
                      borderRadius: 8,
                      display: 'flex',
                      justifyContent: 'space-between',
                      border: '1px solid #eee',
                      color: '#1a1a1a',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#2e7d32' }}>
                        {new Date(item.Tanggal).toLocaleDateString('id-ID')}
                      </strong>
                      : {item.Pesan}
                    </div>
                    <button
                      onClick={() => handleHapus(item._id)}
                      style={{
                        color: '#c62828',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        fontSize: '1.2rem',
                      }}
                      title="Hapus catatan"
                    >
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
              {deleteMessage && (
                <p style={{ color: deleteMessage.startsWith('✅') ? '#2e7d32' : 'red' }}>{deleteMessage}</p>
              )}

              {/* Tombol Gabungkan */}
              <button
                onClick={handleCombine}
                style={{
                  padding: '0.8rem 2rem',
                  background: '#1565c0',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 'bold',
                  fontSize: 16,
                  marginTop: '1rem',
                  cursor: 'pointer',
                }}
              >
                🧩 Gabungkan Semua Pesan
              </button>

              {/* Tampilkan hasil gabungan */}
              {combinedText && (
                <div
                  style={{
                    background: '#e3f2fd',
                    padding: '1rem',
                    borderRadius: 8,
                    marginTop: '1rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    color: '#0d47a1',
                    fontSize: 14,
                    border: '1px solid #90caf9',
                  }}
                >
                  {combinedText}
                </div>
              )}

              {/* Tombol Ringkasan (menggunakan teks gabungan) */}
              <button
                onClick={handleRingkasan}
                disabled={ringkasanLoading || !combinedText}
                style={{
                  padding: '0.8rem 2rem',
                  background: ringkasanLoading || !combinedText ? '#a5d6a7' : '#2e7d32',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 'bold',
                  fontSize: 16,
                  marginTop: '1rem',
                  cursor: ringkasanLoading || !combinedText ? 'not-allowed' : 'pointer',
                }}
              >
                {ringkasanLoading ? 'Menyusun ringkasan...' : '✨ Buat Ringkasan dari Gabungan'}
              </button>

              {ringkasan && (
                <div
                  style={{
                    background: '#f1f8e9',
                    padding: '1.2rem',
                    borderRadius: 10,
                    marginTop: '1.5rem',
                    whiteSpace: 'pre-wrap',
                    color: '#1a1a1a',
                    lineHeight: 1.6,
                    border: '1px solid #c8e6c9',
                  }}
                >
                  {ringkasan}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </main>
  );
}