import crypto from 'node:crypto';
import { q } from './_db.js';
const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => 'K-' + Array.from(crypto.randomBytes(6), (b) => ALPHA[b % ALPHA.length]).join('');
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const b = req.body || {};
      const name = str(b.name, 60), pickup = b.pickup, table = str(b.table, 10), note = str(b.note, 200);
      if (!name) return res.status(400).json({ error: 'Nama pemesan wajib diisi' });
      if (!['ambil', 'antar'].includes(pickup)) return res.status(400).json({ error: 'Metode pengambilan tidak valid' });
      if (pickup === 'antar' && !table) return res.status(400).json({ error: 'Nomor meja wajib diisi' });
      if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 30) return res.status(400).json({ error: 'Keranjang kosong atau terlalu besar' });
      const merged = new Map();
      for (const it of b.items) {
        const id = Number(it?.id), qty = Number(it?.qty);
        if (!Number.isInteger(id) || id < 1 || !Number.isInteger(qty) || qty < 1 || qty > 20) return res.status(400).json({ error: 'Item tidak valid' });
        const cur = merged.get(id);
        if (cur) cur.qty += qty; else merged.set(id, { id, qty, note: str(it.note, 120) });
      }
      const items = [...merged.values()];
      if (items.some((i) => i.qty > 20)) return res.status(400).json({ error: 'Jumlah per item maksimal 20' });
      const rows = await q(`
        WITH req AS (SELECT (x->>'id')::int AS id, (x->>'qty')::int AS qty, NULLIF(x->>'note','') AS note FROM jsonb_array_elements($1::jsonb) x),
        chk AS (SELECT COALESCE(bool_and(p.id IS NOT NULL AND p.available AND p.stock >= r.qty), false) AS ok FROM req r LEFT JOIN products p ON p.id = r.id),
        upd AS (UPDATE products p SET stock = p.stock - r.qty FROM req r WHERE p.id = r.id AND (SELECT ok FROM chk) RETURNING p.id, p.name, p.price, r.qty, r.note),
        ord AS (INSERT INTO orders (code, customer_name, pickup, table_no, payment, note, total)
                SELECT $2, $3, $4, NULLIF($5,''), 'kasir', NULLIF($6,''), SUM(price * qty) FROM upd HAVING COUNT(*) = (SELECT COUNT(*) FROM req) RETURNING id, code),
        itm AS (INSERT INTO order_items (order_id, product_id, name, price, qty, note) SELECT ord.id, upd.id, upd.name, upd.price, upd.qty, upd.note FROM upd, ord RETURNING 1)
        SELECT code FROM ord`, [JSON.stringify(items), newCode(), name, pickup, pickup === 'antar' ? table : '', note]);
      if (!rows.length) return res.status(409).json({ error: 'Stok tidak mencukupi atau menu sudah tidak tersedia. Muat ulang menu.' });
      return res.status(201).json({ code: rows[0].code });
    }
    if (req.method === 'GET') {
      const code = str(req.query.code, 20).toUpperCase();
      if (!code) return res.status(400).json({ error: 'Kode pesanan wajib diisi' });
      const rows = await q(`
        SELECT o.code, o.customer_name, o.pickup, o.table_no, o.note, o.total, o.status, o.created_at, o.updated_at,
          COALESCE(json_agg(json_build_object('name', i.name, 'qty', i.qty, 'price', i.price, 'note', i.note)) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
        FROM orders o LEFT JOIN order_items i ON i.order_id = o.id WHERE o.code = $1 GROUP BY o.id`, [code]);
      if (!rows.length) return res.status(404).json({ error: 'Pesanan tidak ditemukan' });
      return res.status(200).json(rows[0]);
    }
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Metode tidak didukung' });
  } catch (e) {
    if (e.code === '23514') return res.status(409).json({ error: 'Stok baru saja habis. Muat ulang menu.' });
    console.error(e);
    res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
