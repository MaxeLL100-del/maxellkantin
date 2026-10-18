import { q } from './_db.js';
import { checkPassword, issueToken, isAdmin } from './_auth.js';
const STATUS = ['baru', 'diproses', 'siap', 'selesai', 'dibatalkan'];
const int = (v, min, max) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : null; };

export default async function handler(req, res) {
  const a = req.query.a;
  try {
    if (a === 'login' && req.method === 'POST') {
      if (!checkPassword(req.body?.password)) return res.status(401).json({ error: 'Kata sandi salah' });
      return res.status(200).json({ token: issueToken() });
    }
    if (!isAdmin(req)) return res.status(401).json({ error: 'Sesi admin tidak valid atau kedaluwarsa' });

    if (a === 'orders' && req.method === 'GET') {
      return res.status(200).json(await q(`
        SELECT o.id, o.code, o.customer_name, o.pickup, o.table_no, o.note, o.total, o.status, o.created_at,
          COALESCE(json_agg(json_build_object('name', i.name, 'qty', i.qty, 'note', i.note)) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
        FROM orders o LEFT JOIN order_items i ON i.order_id = o.id GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`));
    }
    if (a === 'status' && req.method === 'POST') {
      const id = int(req.body?.id, 1, 2147483647), status = req.body?.status;
      if (!id || !STATUS.includes(status)) return res.status(400).json({ error: 'Data tidak valid' });
      const rows = await q(`
        WITH cur AS (SELECT id FROM orders WHERE id = $1 AND status <> 'dibatalkan'),
        upd AS (UPDATE orders SET status = $2, updated_at = now() WHERE id IN (SELECT id FROM cur) RETURNING id),
        back AS (UPDATE products p SET stock = p.stock + i.qty FROM order_items i WHERE i.product_id = p.id AND i.order_id IN (SELECT id FROM upd) AND $2 = 'dibatalkan' RETURNING 1)
        SELECT id FROM upd`, [id, status]);
      if (!rows.length) return res.status(409).json({ error: 'Pesanan tidak ditemukan atau sudah dibatalkan' });
      return res.status(200).json({ ok: true });
    }
    if (a === 'products' && req.method === 'GET') {
      return res.status(200).json({
        categories: await q('SELECT id, name, icon FROM categories ORDER BY sort, name'),
        products: await q('SELECT id, category_id, name, description, price, stock, image_url, available FROM products ORDER BY name')
      });
    }
    if (a === 'product' && req.method === 'POST') {
      const b = req.body || {};
      const name = String(b.name || '').trim().slice(0, 80), desc = String(b.description || '').trim().slice(0, 200);
      const price = int(b.price, 0, 10000000), stock = int(b.stock, 0, 100000), cat = b.category_id ? int(b.category_id, 1, 2147483647) : null;
      const img = String(b.image_url || '').trim();
      if (!name || price === null || stock === null) return res.status(400).json({ error: 'Nama, harga, dan stok wajib valid' });
      if (img && !/^https:\/\/\S+$/.test(img)) return res.status(400).json({ error: 'URL gambar harus diawali https://' });
      const p = [cat, name, desc, price, stock, img || null, b.available !== false];
      const rows = b.id
        ? await q('UPDATE products SET category_id=$1, name=$2, description=$3, price=$4, stock=$5, image_url=$6, available=$7 WHERE id=$8 RETURNING id', [...p, int(b.id, 1, 2147483647)])
        : await q('INSERT INTO products (category_id, name, description, price, stock, image_url, available) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', p);
      return res.status(rows.length ? 200 : 404).json(rows.length ? { id: rows[0].id } : { error: 'Produk tidak ditemukan' });
    }
    res.status(404).json({ error: 'Aksi tidak dikenal' });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Terjadi kesalahan server' }); }
}
