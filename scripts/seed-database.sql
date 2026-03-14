-- Gabon COD Platform - Seed Data
-- Creates: Admin, Call Center Agents, Sellers, Products, Orders

-- Clean existing data (in correct order due to foreign keys)
DELETE FROM "OrderHistory";
DELETE FROM "OrderItem";
DELETE FROM "CallLog";
DELETE FROM "StockMovement";
DELETE FROM "Stock";
DELETE FROM "WalletTransaction";
DELETE FROM "Wallet";
DELETE FROM "Order";
DELETE FROM "Product";
DELETE FROM "ActivityLog";
DELETE FROM "User";

-- Create Admin User
INSERT INTO "User" (id, email, password, name, phone, role, "isActive", "createdAt")
VALUES (
  'admin-001',
  'admin@gaboncod.com',
  '$2a$10$rQZ7.1bXDMJZGEREr8w3/.VzXGPp1SbF8.Y5vxGYS9gD8bE0V3aHe', -- admin123
  'Admin Gabon COD',
  '+241 077 00 00 00',
  'ADMIN',
  true,
  NOW()
);

-- Create Call Center Agents
INSERT INTO "User" (id, email, password, name, phone, role, "isActive", "createdAt")
VALUES 
(
  'agent-001',
  'merveille@gaboncod.com',
  '$2a$10$xKlRQa5oG0J8YL0OyM6z8uNwS3dCE9HX.kpXvTZR4K3mJ5nL2vQiG', -- agent123
  'Merveille Ondo',
  '+241 066 12 34 56',
  'CALL_CENTER',
  true,
  NOW()
),
(
  'agent-002',
  'gisele@gaboncod.com',
  '$2a$10$xKlRQa5oG0J8YL0OyM6z8uNwS3dCE9HX.kpXvTZR4K3mJ5nL2vQiG', -- agent123
  'Gisèle Ella',
  '+241 062 78 90 12',
  'CALL_CENTER',
  true,
  NOW()
);

-- Create Sellers
INSERT INTO "User" (id, email, password, name, phone, role, "isActive", "createdAt")
VALUES 
(
  'seller-001',
  'herve@gaboncod.com',
  '$2a$10$2kXmVR8J3oF1LN7Tp6QzYe5wUdC4bKRpZq.mY9vD0hS8tE3gHfIjW', -- seller123
  'Hervé Bounguendza',
  '+241 074 11 22 33',
  'SELLER',
  true,
  NOW()
),
(
  'seller-002',
  'chancelle@gaboncod.com',
  '$2a$10$2kXmVR8J3oF1LN7Tp6QzYe5wUdC4bKRpZq.mY9vD0hS8tE3gHfIjW', -- seller123
  'Chancelle Mba',
  '+241 060 44 55 66',
  'SELLER',
  true,
  NOW()
);

-- Create Delivery Men
INSERT INTO "User" (id, email, password, name, phone, role, "isActive", "createdAt")
VALUES 
(
  'delivery-001',
  'jeanclaude@gaboncod.com',
  '$2a$10$pL8mK4nJ2hG6fD3sA9wQ1e7vR5tY0uI6oP8kL2jH4gF5dS3aZ7xC', -- delivery123
  'Jean-Claude Nze',
  '+241 077 88 99 00',
  'DELIVERY',
  true,
  NOW()
);

-- Create Wallets for Sellers
INSERT INTO "Wallet" (id, "sellerId", balance, "totalEarned", "totalDeducted", "updatedAt")
VALUES 
(
  'wallet-001',
  'seller-001',
  125000,
  250000,
  125000,
  NOW()
),
(
  'wallet-002',
  'seller-002',
  85000,
  170000,
  85000,
  NOW()
);

-- Create Products
INSERT INTO "Product" (id, "sellerId", sku, name, "costPrice", "sellPrice", "isActive", "createdAt")
VALUES 
(
  'product-001',
  'seller-001',
  'BP-001',
  'Blender Portable',
  5000,
  15000,
  true,
  NOW()
),
(
  'product-002',
  'seller-001',
  'CM-002',
  'Ceinture Minceur',
  3500,
  12000,
  true,
  NOW()
),
(
  'product-003',
  'seller-002',
  'LS-003',
  'Lampe Solaire',
  2500,
  8000,
  true,
  NOW()
),
(
  'product-004',
  'seller-002',
  'FL-004',
  'Fer à Lisser Pro',
  6000,
  18000,
  true,
  NOW()
),
(
  'product-005',
  'seller-001',
  'BE-005',
  'Brosse Électrique',
  3000,
  10000,
  true,
  NOW()
);

-- Create Stock for Products
INSERT INTO "Stock" (id, "productId", "sellerId", warehouse, quantity, "alertLevel", "updatedAt")
VALUES 
(
  'stock-001',
  'product-001',
  'seller-001',
  'Libreville Main',
  60,
  10,
  NOW()
),
(
  'stock-002',
  'product-002',
  'seller-001',
  'Libreville Main',
  40,
  8,
  NOW()
),
(
  'stock-003',
  'product-003',
  'seller-002',
  'Libreville Main',
  90,
  15,
  NOW()
),
(
  'stock-004',
  'product-004',
  'seller-002',
  'Libreville Main',
  30,
  5,
  NOW()
),
(
  'stock-005',
  'product-005',
  'seller-001',
  'Libreville Main',
  50,
  10,
  NOW()
);

-- Create Stock Movements
INSERT INTO "StockMovement" (id, "stockId", type, quantity, reason, "createdAt")
VALUES 
(
  'movement-001',
  'stock-001',
  'IN',
  60,
  'Initial stock — sourced from supplier',
  NOW()
),
(
  'movement-002',
  'stock-002',
  'IN',
  40,
  'Initial stock — sourced from supplier',
  NOW()
),
(
  'movement-003',
  'stock-003',
  'IN',
  90,
  'Initial stock — sourced from supplier',
  NOW()
),
(
  'movement-004',
  'stock-004',
  'IN',
  30,
  'Initial stock — sourced from supplier',
  NOW()
),
(
  'movement-005',
  'stock-005',
  'IN',
  50,
  'Initial stock — sourced from supplier',
  NOW()
);

-- Create Orders with various statuses
INSERT INTO "Order" (
  id, "trackingNumber", "sellerId", "deliveryManId", "assignedAgentId",
  "recipientName", phone, address, city, "codAmount", status, source,
  "productCost", "shippingCost", "callAttempts", "createdAt", "updatedAt"
)
VALUES 
-- NEW Orders (waiting for call)
(
  'order-001',
  'GC-ABC001',
  'seller-001',
  NULL,
  'agent-001',
  'Marie-Louise Moussavou',
  '+241 066 12 34 01',
  'Akanda, derrière le Total',
  'Libreville',
  15000,
  'NEW',
  'MANUAL',
  5000,
  2000,
  0,
  NOW() - INTERVAL '1 hour',
  NOW()
),
(
  'order-002',
  'GC-ABC002',
  'seller-001',
  NULL,
  'agent-002',
  'Jean-Claude Nze',
  '+241 074 56 78 02',
  'PK5, route de Ntoum',
  'Libreville',
  12000,
  'NEW',
  'IMPORT',
  3500,
  2000,
  0,
  NOW() - INTERVAL '2 hours',
  NOW()
),
(
  'order-003',
  'GC-ABC003',
  'seller-002',
  NULL,
  'agent-001',
  'Yvette Ella',
  '+241 060 11 22 03',
  'Nombakélé, près de la mairie',
  'Libreville',
  8000,
  'NEW',
  'MANUAL',
  2500,
  2000,
  0,
  NOW() - INTERVAL '30 minutes',
  NOW()
),

-- CONFIRMED Orders (ready for shipping)
(
  'order-004',
  'GC-ABC004',
  'seller-001',
  NULL,
  'agent-001',
  'François Mba',
  '+241 077 33 44 04',
  'Louis, face à la station Shell',
  'Libreville',
  15000,
  'CONFIRMED',
  'MANUAL',
  5000,
  2000,
  2,
  NOW() - INTERVAL '1 day',
  NOW()
),
(
  'order-005',
  'GC-ABC005',
  'seller-002',
  NULL,
  'agent-002',
  'Nadège Obiang',
  '+241 062 55 66 05',
  'Owendo, quartier industriel',
  'Libreville',
  18000,
  'CONFIRMED',
  'SHOPIFY',
  6000,
  2000,
  1,
  NOW() - INTERVAL '6 hours',
  NOW()
),

-- SHIPPED Orders (out for delivery)
(
  'order-006',
  'GC-ABC006',
  'seller-001',
  'delivery-001',
  'agent-001',
  'Rodrigue Nguema',
  '+241 066 77 88 06',
  'Nzeng-Ayong, carrefour',
  'Libreville',
  10000,
  'SHIPPED',
  'MANUAL',
  3000,
  2000,
  2,
  NOW() - INTERVAL '2 days',
  NOW()
),
(
  'order-007',
  'GC-ABC007',
  'seller-002',
  'delivery-001',
  'agent-002',
  'Aurore Mintsa',
  '+241 074 99 00 07',
  'Centre-ville, boulevard Triomphal',
  'Libreville',
  8000,
  'SHIPPED',
  'IMPORT',
  2500,
  2000,
  1,
  NOW() - INTERVAL '1 day',
  NOW()
),

-- DELIVERED Orders
(
  'order-008',
  'GC-ABC008',
  'seller-001',
  'delivery-001',
  'agent-001',
  'Thierry Biyogo',
  '+241 060 11 22 08',
  'Angondjé, résidence Les Palmiers',
  'Libreville',
  15000,
  'DELIVERED',
  'MANUAL',
  5000,
  2000,
  1,
  NOW() - INTERVAL '3 days',
  NOW()
),
(
  'order-009',
  'GC-ABC009',
  'seller-001',
  'delivery-001',
  'agent-002',
  'Carine Ondo',
  '+241 077 33 44 09',
  'PK8, route de Kango',
  'Libreville',
  12000,
  'DELIVERED',
  'SHOPIFY',
  3500,
  2000,
  2,
  NOW() - INTERVAL '4 days',
  NOW()
),
(
  'order-010',
  'GC-ABC010',
  'seller-002',
  'delivery-001',
  'agent-001',
  'Patrice Koumba',
  '+241 062 55 66 10',
  'PK12, village Andème',
  'Libreville',
  8000,
  'DELIVERED',
  'MANUAL',
  2500,
  2000,
  1,
  NOW() - INTERVAL '5 days',
  NOW()
),

-- CANCELLED Orders
(
  'order-011',
  'GC-ABC011',
  'seller-001',
  NULL,
  'agent-001',
  'Rose Mvé',
  '+241 066 77 88 11',
  'Plein-Ciel, immeuble Gabon Télécom',
  'Libreville',
  15000,
  'CANCELLED',
  'MANUAL',
  5000,
  2000,
  3,
  NOW() - INTERVAL '2 days',
  NOW()
),
(
  'order-012',
  'GC-ABC012',
  'seller-002',
  NULL,
  'agent-002',
  'Serge Bekale',
  '+241 074 99 00 12',
  'Mont-Bouët, marché',
  'Libreville',
  18000,
  'CANCELLED',
  'IMPORT',
  6000,
  2000,
  2,
  NOW() - INTERVAL '3 days',
  NOW()
),

-- RETURNED Orders
(
  'order-013',
  'GC-ABC013',
  'seller-001',
  'delivery-001',
  'agent-001',
  'Christiane Akue',
  '+241 060 11 22 13',
  'Atong-Abè, église catholique',
  'Libreville',
  10000,
  'RETURNED',
  'MANUAL',
  3000,
  2000,
  2,
  NOW() - INTERVAL '4 days',
  NOW()
),

-- POSTPONED Orders
(
  'order-014',
  'GC-ABC014',
  'seller-002',
  NULL,
  'agent-002',
  'Hervé Bounguendza',
  '+241 077 33 44 14',
  'Batavéa, port autonome',
  'Libreville',
  8000,
  'POSTPONED',
  'SHOPIFY',
  2500,
  2000,
  1,
  NOW() - INTERVAL '1 day',
  NOW()
),

-- Port-Gentil Orders
(
  'order-015',
  'GC-ABC015',
  'seller-001',
  NULL,
  'agent-001',
  'Laetitia Nkoghe',
  '+241 066 12 34 15',
  'Port-Gentil, quartier Ozouri',
  'Port-Gentil',
  15000,
  'CONFIRMED',
  'MANUAL',
  5000,
  3500,
  1,
  NOW() - INTERVAL '12 hours',
  NOW()
);

-- Create Order Items
INSERT INTO "OrderItem" (id, "orderId", "productId", quantity, "unitPrice")
VALUES 
('item-001', 'order-001', 'product-001', 1, 15000),
('item-002', 'order-002', 'product-002', 1, 12000),
('item-003', 'order-003', 'product-003', 1, 8000),
('item-004', 'order-004', 'product-001', 1, 15000),
('item-005', 'order-005', 'product-004', 1, 18000),
('item-006', 'order-006', 'product-005', 1, 10000),
('item-007', 'order-007', 'product-003', 1, 8000),
('item-008', 'order-008', 'product-001', 1, 15000),
('item-009', 'order-009', 'product-002', 1, 12000),
('item-010', 'order-010', 'product-003', 1, 8000),
('item-011', 'order-011', 'product-001', 1, 15000),
('item-012', 'order-012', 'product-004', 1, 18000),
('item-013', 'order-013', 'product-005', 1, 10000),
('item-014', 'order-014', 'product-003', 1, 8000),
('item-015', 'order-015', 'product-001', 1, 15000);

-- Create Order History
INSERT INTO "OrderHistory" (id, "orderId", "previousStatus", "newStatus", "changedById", "createdAt")
VALUES 
('history-001', 'order-001', NULL, 'NEW', 'admin-001', NOW() - INTERVAL '1 hour'),
('history-002', 'order-004', 'NEW', 'CONFIRMED', 'agent-001', NOW() - INTERVAL '20 hours'),
('history-003', 'order-006', 'CONFIRMED', 'SHIPPED', 'admin-001', NOW() - INTERVAL '1 day'),
('history-004', 'order-008', 'SHIPPED', 'DELIVERED', 'delivery-001', NOW() - INTERVAL '2 days'),
('history-005', 'order-011', 'NEW', 'CANCELLED', 'agent-001', NOW() - INTERVAL '1 day'),
('history-006', 'order-013', 'SHIPPED', 'RETURNED', 'delivery-001', NOW() - INTERVAL '2 days');

-- Create Activity Log
INSERT INTO "ActivityLog" (id, "userId", role, action, details, "createdAt")
VALUES (
  'log-001',
  'admin-001',
  'ADMIN',
  'SEED_COMPLETE',
  'Database seeded with test data: 15 orders, 5 products, 2 sellers, 2 agents, 1 delivery man',
  NOW()
);

-- Summary output
SELECT 'SEED COMPLETE' as status,
  (SELECT COUNT(*) FROM "User") as users,
  (SELECT COUNT(*) FROM "Product") as products,
  (SELECT COUNT(*) FROM "Order") as orders;
