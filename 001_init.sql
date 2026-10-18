CREATE TABLE IF NOT EXISTS categories (
  id serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT 'plate' CHECK (icon IN ('plate','bowl','cup','snack')),
  sort int NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
  id serial PRIMARY KEY,
  category_id int REFERENCES categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price int NOT NULL CHECK (price >= 0),
  stock int NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS orders (
  id serial PRIMARY KEY,
  code text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  pickup text NOT NULL CHECK (pickup IN ('ambil','antar')),
  table_no text,
  payment text NOT NULL DEFAULT 'kasir',
  note text,
  total int NOT NULL CHECK (total >= 0),
  status text NOT NULL DEFAULT 'baru' CHECK (status IN ('baru','diproses','siap','selesai','dibatalkan')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS order_items (
  id serial PRIMARY KEY,
  order_id int NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id int REFERENCES products(id) ON DELETE SET NULL,
  name text NOT NULL,
  price int NOT NULL,
  qty int NOT NULL CHECK (qty > 0),
  note text
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_order ON order_items (order_id);
