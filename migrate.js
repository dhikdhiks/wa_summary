// scripts/migrasi-tanggal.js
require('dotenv').config(); // <-- Pastikan ini ada di baris pertama

const mongoose = require('mongoose');

// Disamakan dengan nama di file .env (MONGO_URI)
const MONGODB_URI = process.env.MONGO_URI; 

if (!MONGODB_URI) {
  console.error("Error: Variabel MONGO_URI tidak ditemukan di file .env");
  process.exit(1);
}

mongoose.connect(MONGODB_URI, { dbName: 'database_materi' })
  .then(() => console.log('Koneksi MongoDB Berhasil...'))
  .catch(err => { console.error('Gagal koneksi:', err); process.exit(1); });

const schema = new mongoose.Schema({}, { strict: false, collection: 'materi_halim' });
const Materi = mongoose.model('MateriMigrasi', schema);

async function migrasi() {
  console.log('Memulai migrasi data...');
  const docs = await Materi.find({});
  console.log(`Ditemukan ${docs.length} dokumen.`);

  for (const doc of docs) {
    // Proteksi jika kolom Tanggal kosong atau formatnya sudah berubah jadi objek Date
    if (!doc.Tanggal || typeof doc.Tanggal !== 'string') continue; 

    const tglStr = doc.Tanggal; // "5/5/26"
    const [bulan, hari, tahun] = tglStr.split('/').map(Number);
    
    // format M/D/YY → 5/5/26 = Mei 5, 2026
    const dateObj = new Date(2000 + tahun, bulan - 1, hari);
    
    await Materi.updateOne({ _id: doc._id }, { $set: { Tanggal: dateObj } });
  }
  
  console.log('Migrasi selesai dengan sukses!');
  process.exit(0);
}

migrasi();