import { q } from './_db.js';
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak didukung' });
  try {
    const [categories, products] = await Promise.all([
      q('SELECT id, name, icon FROM categories ORDER BY sort, name'),
      q('SELECT id, category_id, name, description, price, stock, image_url FROM products WHERE available ORDER BY name')
    ]);
    res.status(200).json({ categories, products });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Gagal memuat menu' }); }
}
