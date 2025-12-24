-- Create products table if it doesn't exist
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add image_url column if it doesn't exist (for existing tables)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Upsert products by SKU, including S3 image URLs
INSERT INTO products (sku, name, description, price, image_url, created_at, updated_at) VALUES
  ('BLEND-001', 'NovaKitchen Pro Blender 1200W',
   'High-power 1200W countertop blender with 3-speed control and pulse, ideal for smoothies and soups.',
   89.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/blender/blender-1.jpg', NOW(), NOW()),
  ('BLEND-002', 'SmoothMix Classic Blender 900W',
   'Compact 900W blender with 1.5L glass jar and stainless steel blades.',
   69.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/blender/blender-2.png', NOW(), NOW()),
  ('BLEND-003', 'SmoothMix Personal Blender Go',
   'Personal blender with two 600ml to-go cups, perfect for single-serve shakes.',
   49.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/blender/blender-3.png', NOW(), NOW()),
  ('BLEND-004', 'NovaKitchen QuietBlend 1500W',
   '1500W blender with noise-dampening shield and pre-programmed smoothie modes.',
   129.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/blender/blender-4.png', NOW(), NOW()),
  ('BLEND-005', 'EcoBlend Glass Jar Blender',
   'Energy-efficient blender with durable glass jar and 5-speed control.',
   64.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/blender/blender-5.png', NOW(), NOW()),

  ('TOASTER-001', 'ToastMaster 2-Slice Toaster',
   '2-slice toaster with 7 browning settings and removable crumb tray.',
   29.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/toaster/toaster-1.png', NOW(), NOW()),
  ('TOASTER-002', 'ToastMaster 4-Slice Family Toaster',
   '4-slice wide-slot toaster with bagel and defrost functions.',
   49.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/toaster/toaster-2.png', NOW(), NOW()),

  ('COFFEE-001', 'BrewCraft Drip Coffee Maker 12-Cup',
   'Programmable 12-cup drip coffee maker with reusable filter basket.',
   59.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/coffee-maker/coffe-maker-1.png', NOW(), NOW()),
  ('COFFEE-002', 'EspressoPro Compact Machine',
   'Compact espresso machine with steam wand for cappuccinos and lattes.',
   129.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/coffee-maker/coffe-maker-2.png', NOW(), NOW()),

  ('LAPTOP-001', 'NovaBook 14" Ultrabook i5',
   '14-inch ultrabook with Intel i5, 8GB RAM, 256GB SSD, and full HD display.',
   799.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/laptops/lap_2.png', NOW(), NOW()),
  ('LAPTOP-002', 'NovaBook 15" Performance i7',
   '15.6-inch performance laptop with Intel i7, 16GB RAM, 512GB SSD, and RTX graphics.',
   1199.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/laptops/lap_3.png', NOW(), NOW()),
  ('LAPTOP-003', 'WorkMate 13" Business Laptop',
   '13-inch business laptop with long battery life and fingerprint reader.',
   949.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/laptops/lap-1.png', NOW(), NOW()),

  ('HEADPHONE-001', 'SoundFlow Wireless Headphones',
   'Over-ear Bluetooth headphones with 30-hour battery life and passive noise isolation.',
   89.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/headphones/headphone-1.png', NOW(), NOW()),
  ('HEADPHONE-002', 'SoundFlow Noise Cancelling Pro',
   'Active noise cancelling headphones with ambient sound mode and fast charging.',
   159.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/headphones/headphone-2.png', NOW(), NOW()),
  ('HEADPHONE-003', 'NovaBuds True Wireless Earbuds',
   'True wireless earbuds with charging case and IPX4 sweat resistance.',
   69.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/headphones/headphone-3.png', NOW(), NOW()),

  ('MONITOR-001', 'VisionView 24" IPS Monitor',
   '24-inch IPS monitor with 1080p resolution and ultra-thin bezels.',
   179.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/monitors/monitor-1.png', NOW(), NOW()),
  ('MONITOR-002', 'VisionView 27" QHD Monitor',
   '27-inch QHD monitor with 75Hz refresh rate and adjustable stand.',
   259.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/monitors/monitor-2.png', NOW(), NOW()),
  ('MOUSE-001', 'NovaTech Wireless Mouse',
   'Ergonomic wireless mouse with adjustable DPI and silent clicks.',
   24.99, 'https://novamart-assets-1.s3.us-east-2.amazonaws.com/catalog/monitors/monitor-3.png', NOW(), NOW())
ON CONFLICT (sku) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    image_url = EXCLUDED.image_url,
    updated_at = NOW();