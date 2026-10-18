# Pemesanan Kantin (HTML + CSS + JS, Vercel Functions, PostgreSQL/Neon)

Tanpa PHP. Alur: browser -> `/api/*` (Vercel Functions) -> PostgreSQL. Browser tidak pernah terhubung langsung ke database.

## Menjalankan
1. Buat database Neon, salin connection string.
2. `cp .env.example .env` lalu isi `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_SECRET`.
3. `npm install && npm run migrate` (tambahkan `npm run seed` hanya jika mau data CONTOH).
4. Lokal: `npx vercel dev`. Deploy: push ke GitHub, impor di Vercel, isi 3 variabel lingkungan yang sama.
5. Admin: `/admin`. Isi menu, harga, stok sendiri; tidak ada data bisnis bawaan.

## Catatan
- Stok dikurangi atomik dalam satu query saat pesanan dibuat; pembatalan mengembalikan stok.
- Pembayaran hanya "bayar di kasir". Tidak ada payment gateway.
- Gambar menu: isi URL https di admin. Tanpa gambar, ikon kategori dipakai.
