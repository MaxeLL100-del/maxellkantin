-- CONTOH DATA. Ganti lewat halaman /admin sebelum dipakai sungguhan.
INSERT INTO categories (name, icon, sort) VALUES ('Makanan Berat','plate',1),('Mi & Berkuah','bowl',2),('Camilan','snack',3),('Minuman','cup',4) ON CONFLICT (name) DO NOTHING;
INSERT INTO products (category_id, name, description, price, stock) SELECT c.id, v.n, v.d, v.p, v.s FROM (VALUES
 ('Makanan Berat','Nasi Ayam','Nasi hangat dengan ayam dan lalapan',15000,20),
 ('Makanan Berat','Nasi Goreng','Nasi goreng bumbu rumahan',14000,20),
 ('Mi & Berkuah','Mi Goreng','Mi goreng dengan sayuran',12000,15),
 ('Mi & Berkuah','Soto','Soto kuah hangat dengan nasi',14000,12),
 ('Camilan','Gorengan','Aneka gorengan, isi 3 potong',5000,30),
 ('Minuman','Es Teh','Teh manis dingin',4000,40)
) AS v(cat,n,d,p,s) JOIN categories c ON c.name = v.cat WHERE NOT EXISTS (SELECT 1 FROM products);
