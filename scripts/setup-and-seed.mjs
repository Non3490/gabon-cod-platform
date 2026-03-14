/**
 * Gabon COD Platform — Full DB Setup + Seed Script
 * Creates all tables from Prisma schema then seeds realistic data
 * Run: node --experimental-vm-modules scripts/setup-and-seed.mjs
 */

import { neon } from '@neondatabase/serverless'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'

const sql = neon(process.env.DATABASE_URL)

function cuid() {
  return 'c' + randomBytes(11).toString('hex')
}

function randomPhone() {
  const prefixes = ['060', '061', '062', '066', '074', '077']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const num = Math.floor(Math.random() * 9000000 + 1000000).toString()
  return `+241 ${prefix.slice(1)} ${num.slice(0,2)} ${num.slice(2,4)} ${num.slice(4,6)}`
}

const GABONESE_NAMES = [
  'Marie-Louise Moussavou', 'Jean-Claude Nze', 'Yvette Ella', 'François Mba',
  'Nadège Obiang', 'Rodrigue Nguema', 'Aurore Mintsa', 'Thierry Biyogo',
  'Carine Ondo', 'Patrice Koumba', 'Rose Mvé', 'Serge Bekale',
  'Christiane Akue', 'Laetitia Nkoghe', 'Arnaud Tsinga', 'Bernadette Ogoula',
  'Giscard Moubamba', 'Solange Mfoubou', 'Eric Boundono', 'Martine Bongo',
  'Alexandre Ntoutoume', 'Florence Aboré', 'Désiré Mbadinga', 'Rosalie Kombila',
  'Wilfried Eyené', 'Pascaline Meyo', 'Junior Mebiame', 'Angeline Mombo',
]

const LIBREVILLE_ZONES = [
  'Akanda, derrière le Total', 'PK5, route de Ntoum', 'Nombakélé, près de la mairie',
  'Louis, face à la station Shell', 'Owendo, quartier industriel', 'Nzeng-Ayong, carrefour',
  'Centre-ville, boulevard Triomphal', 'Angondjé, résidence Les Palmiers',
  'PK8, route de Kango', 'PK12, village Andème',
]

const CITIES = ['Libreville', 'Port-Gentil', 'Franceville', 'Oyem']
const CITY_WEIGHTS = [0.72, 0.15, 0.08, 0.05]

function weightedCity() {
  const r = Math.random()
  let sum = 0
  for (let i = 0; i < CITIES.length; i++) {
    sum += CITY_WEIGHTS[i]
    if (r <= sum) return CITIES[i]
  }
  return CITIES[0]
}

function randomAddress(city) {
  if (city === 'Libreville') return LIBREVILLE_ZONES[Math.floor(Math.random() * LIBREVILLE_ZONES.length)]
  if (city === 'Port-Gentil') return `Port-Gentil, quartier ${['Ozouri', 'Agondjé', 'Ballard'][Math.floor(Math.random() * 3)]}`
  return `${city}, quartier central`
}

function daysAgo(d) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000)
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const STATUS_DIST = [
  { status: 'NEW',       weight: 0.05 },
  { status: 'CONFIRMED', weight: 0.06 },
  { status: 'CANCELLED', weight: 0.18 },
  { status: 'SHIPPED',   weight: 0.04 },
  { status: 'DELIVERED', weight: 0.45 },
  { status: 'RETURNED',  weight: 0.13 },
  { status: 'POSTPONED', weight: 0.09 },
]

function pickStatus() {
  const r = Math.random()
  let sum = 0
  for (const s of STATUS_DIST) {
    sum += s.weight
    if (r <= sum) return s.status
  }
  return 'NEW'
}

async function createTables() {
  console.log('Creating enum types...')
  await sql`DO $$ BEGIN
    CREATE TYPE "CycleType" AS ENUM ('SELLER', 'DELIVERY');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`

  await sql`DO $$ BEGIN
    CREATE TYPE "RecordingStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`

  await sql`DO $$ BEGIN
    CREATE TYPE "SourcingStatus" AS ENUM ('SUBMITTED', 'IN_TRANSIT', 'RECEIVED', 'STOCKED', 'REJECTED');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`

  await sql`DO $$ BEGIN
    CREATE TYPE "NotifType" AS ENUM ('ORDER_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_RETURNED');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`

  await sql`DO $$ BEGIN
    CREATE TYPE "NotifChannel" AS ENUM ('SMS', 'WHATSAPP');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$`

  console.log('Creating tables...')

  await sql`
    CREATE TABLE IF NOT EXISTS "TenantSettings" (
      "id" TEXT PRIMARY KEY,
      "twilioSid" TEXT,
      "twilioToken" TEXT,
      "twilioPhone" TEXT,
      "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
      "pusherAppId" TEXT,
      "pusherKey" TEXT,
      "pusherCluster" TEXT,
      "pusherChannel" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT PRIMARY KEY,
      "email" TEXT UNIQUE NOT NULL,
      "password" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "phone" TEXT,
      "role" TEXT NOT NULL DEFAULT 'SELLER',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "parentSellerId" TEXT,
      "zoneId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "tenantSettingsId" TEXT
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "AgentSession" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT UNIQUE NOT NULL REFERENCES "User"("id"),
      "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "isOnline" BOOLEAN NOT NULL DEFAULT false
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "Blacklist" (
      "id" TEXT PRIMARY KEY,
      "phone" TEXT UNIQUE NOT NULL,
      "reason" TEXT,
      "autoFlagged" BOOLEAN NOT NULL DEFAULT true,
      "returnCount" INT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "removedAt" TIMESTAMP(3),
      "removedBy" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "Zone" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "city" TEXT NOT NULL,
      "description" TEXT
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT PRIMARY KEY,
      "trackingNumber" TEXT UNIQUE NOT NULL,
      "sellerId" TEXT NOT NULL REFERENCES "User"("id"),
      "deliveryManId" TEXT REFERENCES "User"("id"),
      "zoneId" TEXT,
      "assignedAgentId" TEXT REFERENCES "User"("id"),
      "lockedByAgentId" TEXT,
      "lockedAt" TIMESTAMP(3),
      "callAttempts" INT NOT NULL DEFAULT 0,
      "priority" INT NOT NULL DEFAULT 0,
      "recipientName" TEXT NOT NULL,
      "phone" TEXT NOT NULL,
      "address" TEXT NOT NULL,
      "city" TEXT NOT NULL,
      "note" TEXT,
      "codAmount" FLOAT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'NEW',
      "source" TEXT NOT NULL DEFAULT 'MANUAL',
      "groupId" TEXT,
      "bundleGroupId" TEXT,
      "scheduledCallAt" TIMESTAMP(3),
      "podPhotoUrl" TEXT,
      "podSignatureUrl" TEXT,
      "carrierId" TEXT,
      "carrierName" TEXT,
      "awbTrackingCode" TEXT,
      "awbLabelUrl" TEXT,
      "dispatchedAt" TIMESTAMP(3),
      "productCost" FLOAT NOT NULL DEFAULT 0,
      "shippingCost" FLOAT NOT NULL DEFAULT 0,
      "callCenterFee" FLOAT NOT NULL DEFAULT 0,
      "platformFee" FLOAT NOT NULL DEFAULT 5000,
      "bundleDeliveryShare" FLOAT,
      "adSpend" FLOAT NOT NULL DEFAULT 0,
      "confirmedAt" TIMESTAMP(3),
      "shippedAt" TIMESTAMP(3),
      "deliveredAt" TIMESTAMP(3),
      "returnedAt" TIMESTAMP(3),
      "cancelledAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT NOT NULL REFERENCES "User"("id"),
      "sku" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "costPrice" FLOAT NOT NULL,
      "sellPrice" FLOAT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "authorizeOpen" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("sellerId", "sku")
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "OrderItem" (
      "id" TEXT PRIMARY KEY,
      "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
      "productId" TEXT REFERENCES "Product"("id"),
      "quantity" INT NOT NULL,
      "unitPrice" FLOAT NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "OrderHistory" (
      "id" TEXT PRIMARY KEY,
      "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
      "previousStatus" TEXT,
      "newStatus" TEXT NOT NULL,
      "changedById" TEXT NOT NULL,
      "note" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "CallLog" (
      "id" TEXT PRIMARY KEY,
      "orderId" TEXT NOT NULL REFERENCES "Order"("id") ON DELETE CASCADE,
      "agentId" TEXT NOT NULL REFERENCES "User"("id"),
      "attempt" TEXT NOT NULL,
      "comment" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "Stock" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL REFERENCES "Product"("id"),
      "sellerId" TEXT NOT NULL REFERENCES "User"("id"),
      "warehouse" TEXT NOT NULL,
      "quantity" INT NOT NULL DEFAULT 0,
      "alertLevel" INT NOT NULL DEFAULT 5,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "StockMovement" (
      "id" TEXT PRIMARY KEY,
      "stockId" TEXT NOT NULL REFERENCES "Stock"("id"),
      "type" TEXT NOT NULL,
      "quantity" INT NOT NULL,
      "reason" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "ExpenseType" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "description" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "Expense" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT REFERENCES "User"("id"),
      "agentId" TEXT REFERENCES "User"("id"),
      "orderId" TEXT UNIQUE REFERENCES "Order"("id"),
      "category" TEXT NOT NULL,
      "expenseTypeId" TEXT REFERENCES "ExpenseType"("id"),
      "amount" FLOAT NOT NULL,
      "description" TEXT,
      "incurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "Invoice" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT NOT NULL REFERENCES "User"("id"),
      "deliveryManId" TEXT REFERENCES "User"("id"),
      "ref" TEXT UNIQUE NOT NULL,
      "cashCollected" FLOAT NOT NULL DEFAULT 0,
      "refundedAmount" FLOAT NOT NULL DEFAULT 0,
      "subtotal" FLOAT NOT NULL,
      "vat" FLOAT NOT NULL DEFAULT 0,
      "totalNet" FLOAT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'UNPAID',
      "cycleType" "CycleType" NOT NULL DEFAULT 'SELLER',
      "dateFrom" TIMESTAMP(3) NOT NULL,
      "dateTo" TIMESTAMP(3) NOT NULL,
      "isLocked" BOOLEAN NOT NULL DEFAULT false,
      "lockedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "Wallet" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT UNIQUE NOT NULL REFERENCES "User"("id"),
      "balance" FLOAT NOT NULL DEFAULT 0,
      "totalEarned" FLOAT NOT NULL DEFAULT 0,
      "totalDeducted" FLOAT NOT NULL DEFAULT 0,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "WalletTransaction" (
      "id" TEXT PRIMARY KEY,
      "walletId" TEXT NOT NULL REFERENCES "Wallet"("id"),
      "type" TEXT NOT NULL,
      "amount" FLOAT NOT NULL,
      "description" TEXT NOT NULL,
      "orderId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "WithdrawalRequest" (
      "id" TEXT PRIMARY KEY,
      "walletId" TEXT NOT NULL REFERENCES "Wallet"("id"),
      "amount" FLOAT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "processedAt" TIMESTAMP(3),
      "processedBy" TEXT,
      "note" TEXT
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "ActivityLog" (
      "id" TEXT PRIMARY KEY,
      "userId" TEXT NOT NULL REFERENCES "User"("id"),
      "role" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "details" TEXT NOT NULL,
      "ipAddress" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "SystemSetting" (
      "id" TEXT PRIMARY KEY,
      "key" TEXT UNIQUE NOT NULL,
      "value" TEXT NOT NULL,
      "description" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "Integration" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT NOT NULL REFERENCES "User"("id"),
      "platform" TEXT NOT NULL,
      "secret" TEXT NOT NULL,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("sellerId", "platform")
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "GoogleSheet" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT NOT NULL REFERENCES "User"("id"),
      "spreadsheetId" TEXT NOT NULL,
      "sheetName" TEXT NOT NULL,
      "lastSyncedAt" TIMESTAMP(3),
      "lastSyncStatus" TEXT,
      "lastSyncError" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "ApiKey" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT UNIQUE NOT NULL REFERENCES "User"("id"),
      "key" TEXT UNIQUE NOT NULL,
      "lastUsedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "StockSnapshot" (
      "id" TEXT PRIMARY KEY,
      "productId" TEXT NOT NULL REFERENCES "Product"("id"),
      "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "initialStock" INT NOT NULL,
      "inForDelivery" INT NOT NULL DEFAULT 0,
      "outForDelivery" INT NOT NULL DEFAULT 0,
      "finalStock" INT NOT NULL,
      "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("productId", "snapshotDate")
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "DeliveryLocation" (
      "id" TEXT PRIMARY KEY,
      "driverId" TEXT NOT NULL REFERENCES "User"("id"),
      "lat" FLOAT NOT NULL,
      "lng" FLOAT NOT NULL,
      "address" TEXT,
      "accuracy" FLOAT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "DeliveryFeeConfig" (
      "id" TEXT PRIMARY KEY,
      "deliveryManId" TEXT UNIQUE NOT NULL REFERENCES "User"("id"),
      "costPerDelivery" FLOAT NOT NULL DEFAULT 0,
      "bonusAmount" FLOAT NOT NULL DEFAULT 0,
      "penaltyAmount" FLOAT NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "CatalogProduct" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "imageUrl" TEXT,
      "costPrice" FLOAT NOT NULL,
      "category" TEXT,
      "countryAvailable" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "CatalogFavorite" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT NOT NULL REFERENCES "User"("id"),
      "catalogProductId" TEXT NOT NULL REFERENCES "CatalogProduct"("id"),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("sellerId", "catalogProductId")
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "SourcingRequest" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT NOT NULL REFERENCES "User"("id"),
      "productName" TEXT NOT NULL,
      "description" TEXT,
      "referenceUrl" TEXT,
      "images" TEXT DEFAULT '[]',
      "quantity" INT NOT NULL DEFAULT 1,
      "country" TEXT NOT NULL DEFAULT '',
      "shippingMethod" TEXT NOT NULL DEFAULT '',
      "trackingDetails" TEXT,
      "type" TEXT NOT NULL DEFAULT 'INBOUND',
      "status" "SourcingStatus" NOT NULL DEFAULT 'SUBMITTED',
      "adminNote" TEXT,
      "receivedQty" INT,
      "receivedImages" TEXT DEFAULT '[]',
      "damagedQty" INT DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "reviewedAt" TIMESTAMP(3),
      "reviewedBy" TEXT,
      "inTransitAt" TIMESTAMP(3),
      "receivedAt" TIMESTAMP(3),
      "stockedAt" TIMESTAMP(3)
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "CallRecording" (
      "id" TEXT PRIMARY KEY,
      "orderId" TEXT NOT NULL REFERENCES "Order"("id"),
      "agentId" TEXT NOT NULL REFERENCES "User"("id"),
      "twilioCallSid" TEXT UNIQUE NOT NULL,
      "recordingUrl" TEXT NOT NULL,
      "recordingSid" TEXT NOT NULL,
      "durationSeconds" INT NOT NULL DEFAULT 0,
      "status" "RecordingStatus" NOT NULL DEFAULT 'PENDING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "NotificationLog" (
      "id" TEXT PRIMARY KEY,
      "orderId" TEXT NOT NULL REFERENCES "Order"("id"),
      "type" "NotifType" NOT NULL,
      "channel" "NotifChannel" NOT NULL,
      "phone" TEXT NOT NULL,
      "message" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  console.log('All tables created.')
}

async function main() {
  console.log('Setting up Gabon COD Platform database...')

  await createTables()

  // ── HASH PASSWORDS ───────────────────────────────────────────────
  console.log('Hashing passwords...')
  const [pwAdmin, pwSeller, pwAgent, pwDelivery] = await Promise.all([
    hash('admin123', 12),
    hash('seller123', 12),
    hash('agent123', 12),
    hash('delivery123', 12),
  ])
  console.log('Passwords hashed.')

  // ── CLEAR EXISTING DATA ──────────────────────────────────────────
  console.log('Clearing existing data...')
  await sql`DELETE FROM "ActivityLog"`
  await sql`DELETE FROM "WalletTransaction"`
  await sql`DELETE FROM "WithdrawalRequest"`
  await sql`DELETE FROM "Wallet"`
  await sql`DELETE FROM "OrderHistory"`
  await sql`DELETE FROM "CallLog"`
  await sql`DELETE FROM "OrderItem"`
  await sql`DELETE FROM "Order"`
  await sql`DELETE FROM "StockMovement"`
  await sql`DELETE FROM "Stock"`
  await sql`DELETE FROM "Product"`
  await sql`DELETE FROM "AgentSession"`
  await sql`DELETE FROM "User"`
  console.log('Existing data cleared.')

  // ── SEED ADMIN ───────────────────────────────────────────────────
  const adminId = cuid()
  await sql`
    INSERT INTO "User" ("id","email","password","name","phone","role","isActive","createdAt")
    VALUES (${adminId},'admin@gaboncod.com',${pwAdmin},'Admin Gabon COD','+241 077 00 00 00','ADMIN',true,NOW())
  `

  // ── SEED SELLERS ─────────────────────────────────────────────────
  const sellerIds = []
  const sellerProfiles = [
    { name: 'Hervé Bounguendza', email: 'herve@gaboncod.com' },
    { name: 'Chancelle Mba',     email: 'chancelle@gaboncod.com' },
    { name: 'Patrick Koumba',    email: 'patrick@gaboncod.com' },
    { name: 'Laure Mintsa',      email: 'laure@gaboncod.com' },
    { name: 'Joël Nguema',       email: 'joel@gaboncod.com' },
  ]
  for (const s of sellerProfiles) {
    const id = cuid()
    sellerIds.push(id)
    await sql`
      INSERT INTO "User" ("id","email","password","name","phone","role","isActive","createdAt")
      VALUES (${id},${s.email},${pwSeller},${s.name},${randomPhone()},'SELLER',true,NOW())
    `
  }

  // ── SEED CALL CENTER AGENTS ──────────────────────────────────────
  const agentIds = []
  const agentProfiles = [
    { name: 'Merveille Ondo', email: 'merveille@gaboncod.com' },
    { name: 'Gisèle Ella',    email: 'gisele@gaboncod.com' },
  ]
  for (const a of agentProfiles) {
    const id = cuid()
    agentIds.push(id)
    await sql`
      INSERT INTO "User" ("id","email","password","name","phone","role","isActive","createdAt")
      VALUES (${id},${a.email},${pwAgent},${a.name},${randomPhone()},'CALL_CENTER',true,NOW())
    `
  }

  // ── SEED DELIVERY MEN ────────────────────────────────────────────
  const deliveryIds = []
  const deliveryProfiles = [
    { name: 'Jean-Claude Nze', email: 'jeanclaude@gaboncod.com' },
    { name: 'Rodrigue Bekale', email: 'rodrigue@gaboncod.com' },
    { name: 'Serge Moubamba',  email: 'serge@gaboncod.com' },
  ]
  for (const d of deliveryProfiles) {
    const id = cuid()
    deliveryIds.push(id)
    await sql`
      INSERT INTO "User" ("id","email","password","name","phone","role","isActive","createdAt")
      VALUES (${id},${d.email},${pwDelivery},${d.name},${randomPhone()},'DELIVERY',true,NOW())
    `
  }

  console.log(`Users seeded: 1 admin, 5 sellers, 2 agents, 3 delivery men.`)

  // ── SEED PRODUCTS + STOCK ────────────────────────────────────────
  const productConfigs = [
    { name: 'Blender Portable',  sku: 'BP-001', costPrice: 5000,  sellPrice: 15000, stock: 60, alertLevel: 10, leads: 45, sellerIdx: 0 },
    { name: 'Ceinture Minceur',  sku: 'CM-002', costPrice: 3500,  sellPrice: 12000, stock: 40, alertLevel: 8,  leads: 34, sellerIdx: 1 },
    { name: 'Lampe Solaire',     sku: 'LS-003', costPrice: 2500,  sellPrice: 8000,  stock: 90, alertLevel: 15, leads: 78, sellerIdx: 2 },
    { name: 'Fer a Lisser Pro',  sku: 'FL-004', costPrice: 6000,  sellPrice: 18000, stock: 30, alertLevel: 5,  leads: 45, sellerIdx: 3 },
    { name: 'Brosse Electrique', sku: 'BE-005', costPrice: 3000,  sellPrice: 10000, stock: 50, alertLevel: 10, leads: 34, sellerIdx: 4 },
  ]

  const productRows = []
  for (const cfg of productConfigs) {
    const pid = cuid()
    productRows.push({ id: pid, cfg })
    const sellerId = sellerIds[cfg.sellerIdx]
    await sql`
      INSERT INTO "Product" ("id","sellerId","sku","name","costPrice","sellPrice","isActive","createdAt")
      VALUES (${pid},${sellerId},${cfg.sku},${cfg.name},${cfg.costPrice},${cfg.sellPrice},true,NOW())
    `
    const sid = cuid()
    await sql`
      INSERT INTO "Stock" ("id","productId","sellerId","warehouse","quantity","alertLevel","updatedAt")
      VALUES (${sid},${pid},${sellerId},'Libreville Main',${cfg.stock},${cfg.alertLevel},NOW())
    `
    await sql`
      INSERT INTO "StockMovement" ("id","stockId","type","quantity","reason","createdAt")
      VALUES (${cuid()},${sid},'IN',${cfg.stock},'Initial stock entry',NOW())
    `
  }
  console.log(`5 products and stock seeded.`)

  // ── SEED WALLETS ─────────────────────────────────────────────────
  const walletMap = {}
  for (const sid of sellerIds) {
    const wid = cuid()
    walletMap[sid] = wid
    await sql`
      INSERT INTO "Wallet" ("id","sellerId","balance","totalEarned","totalDeducted","updatedAt")
      VALUES (${wid},${sid},0,0,0,NOW())
    `
  }
  console.log(`5 wallets seeded.`)

  // ── SEED ORDERS ──────────────────────────────────────────────────
  console.log('Seeding orders...')
  let orderCount = 0
  const usedPhones = new Set()

  for (const { id: productId, cfg } of productRows) {
    const sellerId = sellerIds[cfg.sellerIdx]
    const walletId = walletMap[sellerId]

    for (let i = 0; i < cfg.leads; i++) {
      const status = pickStatus()

      let phone = randomPhone()
      let attempts = 0
      while (usedPhones.has(phone) && attempts < 100) {
        phone = randomPhone()
        attempts++
      }
      usedPhones.add(phone)

      const city = weightedCity()
      const createdAt = daysAgo(Math.floor(Math.random() * 7))

      let deliveryManId = null
      if (['SHIPPED', 'DELIVERED', 'RETURNED', 'POSTPONED'].includes(status)) {
        if (city === 'Port-Gentil') deliveryManId = deliveryIds[2]
        else deliveryManId = Math.random() < 0.6 ? deliveryIds[0] : deliveryIds[1]
      }

      const assignedAgentId = agentIds[orderCount % 2]
      const trackingNumber = `GC-${randomBytes(3).toString('hex').toUpperCase()}`

      let confirmedAt = null, shippedAt = null, deliveredAt = null, returnedAt = null, cancelledAt = null
      if (['CONFIRMED','SHIPPED','DELIVERED','RETURNED'].includes(status)) {
        confirmedAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000).toISOString()
      }
      if (['SHIPPED','DELIVERED','RETURNED'].includes(status)) {
        shippedAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString()
      }
      if (status === 'DELIVERED') {
        deliveredAt = new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString()
      }
      if (status === 'RETURNED') {
        returnedAt = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
      }
      if (status === 'CANCELLED') {
        cancelledAt = new Date(createdAt.getTime() + 60 * 60 * 1000).toISOString()
      }

      const orderId = cuid()
      const recipientName = pick(GABONESE_NAMES)
      const address = randomAddress(city)
      const source = Math.random() < 0.6 ? 'MANUAL' : 'CSV'
      const callAttempts = status === 'NEW' ? 0 : Math.floor(Math.random() * 3) + 1
      const createdAtStr = createdAt.toISOString()

      await sql`
        INSERT INTO "Order" (
          "id","trackingNumber","sellerId","deliveryManId","assignedAgentId",
          "recipientName","phone","address","city","codAmount","status","source",
          "productCost","shippingCost","callAttempts",
          "confirmedAt","shippedAt","deliveredAt","returnedAt","cancelledAt",
          "createdAt","updatedAt"
        ) VALUES (
          ${orderId},${trackingNumber},${sellerId},${deliveryManId},${assignedAgentId},
          ${recipientName},${phone},${address},${city},${cfg.sellPrice},${status},${source},
          ${cfg.costPrice},${2000},${callAttempts},
          ${confirmedAt}::TIMESTAMP,${shippedAt}::TIMESTAMP,${deliveredAt}::TIMESTAMP,
          ${returnedAt}::TIMESTAMP,${cancelledAt}::TIMESTAMP,
          ${createdAtStr}::TIMESTAMP,${createdAtStr}::TIMESTAMP
        )
      `

      await sql`
        INSERT INTO "OrderItem" ("id","orderId","productId","quantity","unitPrice")
        VALUES (${cuid()},${orderId},${productId},1,${cfg.sellPrice})
      `

      await sql`
        INSERT INTO "OrderHistory" ("id","orderId","newStatus","changedById","createdAt")
        VALUES (${cuid()},${orderId},${status},${adminId},${createdAtStr}::TIMESTAMP)
      `

      if (status === 'DELIVERED') {
        await sql`
          UPDATE "Wallet"
          SET "balance"="balance"+${cfg.sellPrice},
              "totalEarned"="totalEarned"+${cfg.sellPrice},
              "updatedAt"=NOW()
          WHERE "id"=${walletId}
        `
        await sql`
          INSERT INTO "WalletTransaction" ("id","walletId","type","amount","description","orderId","createdAt")
          VALUES (${cuid()},${walletId},'CREDIT',${cfg.sellPrice},${'COD collected: '+trackingNumber},${orderId},NOW())
        `
      }

      orderCount++
    }
  }

  console.log(`${orderCount} orders seeded.`)

  // ── ACTIVITY LOG ─────────────────────────────────────────────────
  await sql`
    INSERT INTO "ActivityLog" ("id","userId","role","action","details","createdAt")
    VALUES (
      ${cuid()},${adminId},'ADMIN','SEED_COMPLETE',
      ${`Seeded: ${orderCount} orders, 5 sellers, 2 agents, 3 delivery men, 5 products`},
      NOW()
    )
  `

  console.log('\n=== SEED COMPLETE ===')
  console.log('LOGIN CREDENTIALS')
  console.log('ADMIN:    admin@gaboncod.com      / admin123')
  console.log('AGENTS:   merveille@gaboncod.com  / agent123')
  console.log('          gisele@gaboncod.com     / agent123')
  console.log('SELLERS:  herve@gaboncod.com      / seller123')
  console.log('          chancelle@gaboncod.com  / seller123')
  console.log('          patrick@gaboncod.com    / seller123')
  console.log('          laure@gaboncod.com      / seller123')
  console.log('          joel@gaboncod.com       / seller123')
  console.log('DELIVERY: jeanclaude@gaboncod.com / delivery123')
  console.log('          rodrigue@gaboncod.com   / delivery123')
  console.log('          serge@gaboncod.com      / delivery123')
}

main().catch(e => { console.error('Seed failed:', e.message); process.exit(1) })
