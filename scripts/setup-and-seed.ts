/**
 * Gabon COD Platform — Full DB Setup + Seed Script
 * Creates all tables then seeds admin, call center agents, sellers, products, orders
 */

import { neon } from '@neondatabase/serverless'
import { hash } from 'bcryptjs'
import { randomBytes } from 'crypto'

const sql = neon(process.env.DATABASE_URL!)

function cuid(): string {
  return 'c' + randomBytes(11).toString('hex')
}

function randomPhone(): string {
  const prefixes = ['060', '061', '062', '066', '074', '077']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const num = Math.floor(Math.random() * 9000000 + 1000000).toString()
  return `+241 ${prefix.slice(1)} ${num.slice(0, 2)} ${num.slice(2, 4)} ${num.slice(4, 6)}`
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

function weightedCity(): string {
  const r = Math.random()
  let sum = 0
  for (let i = 0; i < CITIES.length; i++) {
    sum += CITY_WEIGHTS[i]
    if (r <= sum) return CITIES[i]
  }
  return CITIES[0]
}

function randomAddress(city: string): string {
  if (city === 'Libreville') return LIBREVILLE_ZONES[Math.floor(Math.random() * LIBREVILLE_ZONES.length)]
  if (city === 'Port-Gentil') return `Port-Gentil, quartier ${['Ozouri', 'Agondjé', 'Ballard'][Math.floor(Math.random() * 3)]}`
  return `${city}, quartier central`
}

function daysAgo(d: number): Date {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000)
}

function pick<T>(arr: T[]): T {
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

function pickStatus(): string {
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

  await sql`DO $$ BEGIN CREATE TYPE "CycleType" AS ENUM ('SELLER', 'DELIVERY'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`
  await sql`DO $$ BEGIN CREATE TYPE "RecordingStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`
  await sql`DO $$ BEGIN CREATE TYPE "SourcingStatus" AS ENUM ('SUBMITTED', 'IN_TRANSIT', 'RECEIVED', 'STOCKED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`
  await sql`DO $$ BEGIN CREATE TYPE "NotifType" AS ENUM ('ORDER_CONFIRMED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'ORDER_RETURNED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`
  await sql`DO $$ BEGIN CREATE TYPE "NotifChannel" AS ENUM ('SMS', 'WHATSAPP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`

  console.log('Creating tables...')

  await sql`
    CREATE TABLE IF NOT EXISTS "TenantSettings" (
      "id" TEXT PRIMARY KEY,
      "twilioSid" TEXT, "twilioToken" TEXT, "twilioPhone" TEXT,
      "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
      "pusherAppId" TEXT, "pusherKey" TEXT, "pusherCluster" TEXT, "pusherChannel" TEXT,
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
      "removedAt" TIMESTAMP(3), "removedBy" TEXT,
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
      "lockedByAgentId" TEXT, "lockedAt" TIMESTAMP(3),
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
      "groupId" TEXT, "bundleGroupId" TEXT,
      "scheduledCallAt" TIMESTAMP(3),
      "podPhotoUrl" TEXT, "podSignatureUrl" TEXT,
      "carrierId" TEXT, "carrierName" TEXT, "awbTrackingCode" TEXT, "awbLabelUrl" TEXT,
      "dispatchedAt" TIMESTAMP(3),
      "productCost" FLOAT NOT NULL DEFAULT 0,
      "shippingCost" FLOAT NOT NULL DEFAULT 0,
      "callCenterFee" FLOAT NOT NULL DEFAULT 0,
      "platformFee" FLOAT NOT NULL DEFAULT 5000,
      "bundleDeliveryShare" FLOAT,
      "adSpend" FLOAT NOT NULL DEFAULT 0,
      "confirmedAt" TIMESTAMP(3), "shippedAt" TIMESTAMP(3),
      "deliveredAt" TIMESTAMP(3), "returnedAt" TIMESTAMP(3), "cancelledAt" TIMESTAMP(3),
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
      "processedAt" TIMESTAMP(3), "processedBy" TEXT, "note" TEXT
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
      "lastSyncedAt" TIMESTAMP(3), "lastSyncStatus" TEXT, "lastSyncError" TEXT,
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
      "lat" FLOAT NOT NULL, "lng" FLOAT NOT NULL,
      "address" TEXT, "accuracy" FLOAT,
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
      "description" TEXT, "imageUrl" TEXT,
      "costPrice" FLOAT NOT NULL,
      "category" TEXT, "countryAvailable" TEXT,
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
      "description" TEXT, "referenceUrl" TEXT,
      "images" TEXT DEFAULT '[]',
      "quantity" INT NOT NULL DEFAULT 1,
      "country" TEXT NOT NULL DEFAULT '',
      "shippingMethod" TEXT NOT NULL DEFAULT '',
      "trackingDetails" TEXT,
      "type" TEXT NOT NULL DEFAULT 'INBOUND',
      "status" "SourcingStatus" NOT NULL DEFAULT 'SUBMITTED',
      "adminNote" TEXT, "receivedQty" INT,
      "receivedImages" TEXT DEFAULT '[]',
      "damagedQty" INT DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "reviewedAt" TIMESTAMP(3), "reviewedBy" TEXT,
      "inTransitAt" TIMESTAMP(3), "receivedAt" TIMESTAMP(3), "stockedAt" TIMESTAMP(3)
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

  await sql`
    CREATE TABLE IF NOT EXISTS "TwilioSettings" (
      "id" TEXT PRIMARY KEY,
      "accountSid" TEXT NOT NULL, "authToken" TEXT NOT NULL,
      "apiKey" TEXT NOT NULL, "apiSecret" TEXT NOT NULL,
      "twimlAppSid" TEXT NOT NULL, "phoneNumber" TEXT NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "CarrierSettings" (
      "id" TEXT PRIMARY KEY,
      "name" TEXT NOT NULL,
      "apiKey" TEXT NOT NULL, "apiSecret" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "webhookUrl" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `

  console.log('All tables created successfully.')
}

async function main() {
  console.log('=== Gabon COD Platform — DB Setup + Seed ===')

  await createTables()

  // ── HASH PASSWORDS ────────────────────────────────────────────────
  console.log('Hashing passwords...')
  const [pwAdmin, pwSeller, pwAgent, pwDelivery] = await Promise.all([
    hash('admin123', 12),
    hash('seller123', 12),
    hash('agent123', 12),
    hash('delivery123', 12),
  ])
  console.log('Passwords hashed.')

  // ── CLEAR EXISTING DATA ───────────────────────────────────────────
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
  console.log('Cleared.')

  // ── ADMIN ─────────────────────────────────────────────────────────
  const adminId = cuid()
  await sql`
    INSERT INTO "User" ("id","email","password","name","phone","role","isActive","createdAt")
    VALUES (${adminId},'admin@gaboncod.com',${pwAdmin},'Admin Gabon COD','+241 077 00 00 00','ADMIN',true,NOW())
  `
  console.log('Admin created: admin@gaboncod.com / admin123')

  // ── SELLERS ───────────────────────────────────────────────────────
  const sellerIds: string[] = []
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
  console.log('5 sellers created.')

  // ── CALL CENTER AGENTS ────────────────────────────────────────────
  const agentIds: string[] = []
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
  console.log('2 call center agents created: merveille@gaboncod.com & gisele@gaboncod.com / agent123')

  // ── DELIVERY MEN ─────────────────────────────────────────────────
  const deliveryIds: string[] = []
  const deliveryProfiles = [
    { name: 'Rodrigue Mbadinga', email: 'rodrigue@gaboncod.com' },
    { name: 'Thierry Nze',       email: 'thierry@gaboncod.com' },
    { name: 'Serge Obiang',      email: 'serge@gaboncod.com' },
  ]
  for (const d of deliveryProfiles) {
    const id = cuid()
    deliveryIds.push(id)
    await sql`
      INSERT INTO "User" ("id","email","password","name","phone","role","isActive","createdAt")
      VALUES (${id},${d.email},${pwDelivery},${d.name},${randomPhone()},'DELIVERY_MAN',true,NOW())
    `
  }
  console.log('3 delivery men created.')

  // ── PRODUCTS ──────────────────────────────────────────────────────
  const productDefs = [
    { sku: 'SLIP-SLIM-001', name: 'Chaussure Slip-on Slim',       costPrice: 12000, sellPrice: 25000 },
    { sku: 'CRTN-BIO-002',  name: 'Crème Blanchissante Bio 200ml', costPrice: 8000,  sellPrice: 18000 },
    { sku: 'CEIN-SLIM-003', name: 'Ceinture Amincissante Pro',     costPrice: 6000,  sellPrice: 15000 },
    { sku: 'PERF-ORG-004',  name: 'Parfum Oriental 50ml',          costPrice: 9000,  sellPrice: 20000 },
    { sku: 'SACS-CUIR-005', name: 'Sac à Main Cuir Synthétique',   costPrice: 14000, sellPrice: 30000 },
  ]

  // Spread products across sellers
  const productIds: string[] = []
  const productSellerMap: Record<string, string> = {}
  for (let i = 0; i < productDefs.length; i++) {
    const p = productDefs[i]
    const sellerId = sellerIds[i % sellerIds.length]
    const id = cuid()
    productIds.push(id)
    productSellerMap[id] = sellerId
    await sql`
      INSERT INTO "Product" ("id","sellerId","sku","name","costPrice","sellPrice","isActive","createdAt")
      VALUES (${id},${sellerId},${p.sku},${p.name},${p.costPrice},${p.sellPrice},true,NOW())
    `
    // Stock entry
    const stockId = cuid()
    const qty = Math.floor(Math.random() * 150) + 50
    await sql`
      INSERT INTO "Stock" ("id","productId","sellerId","warehouse","quantity","alertLevel","updatedAt")
      VALUES (${stockId},${id},${sellerId},'Libreville Principal',${qty},10,NOW())
    `
  }
  console.log('5 products + stock created.')

  // ── ORDERS ────────────────────────────────────────────────────────
  console.log('Creating orders...')
  let orderCount = 0

  for (let i = 0; i < 236; i++) {
    const orderId   = cuid()
    const trackNum  = `GAB-${String(10000 + i).padStart(5, '0')}`
    const sellerId  = pick(sellerIds)
    const agentId   = pick(agentIds)
    const status    = pickStatus()
    const city      = weightedCity()
    const address   = randomAddress(city)
    const name      = pick(GABONESE_NAMES)
    const phone     = randomPhone()
    const product   = productDefs[Math.floor(Math.random() * productDefs.length)]
    const codAmount = product.sellPrice
    const daysBack  = Math.floor(Math.random() * 90)
    const createdAt = daysAgo(daysBack)

    let confirmedAt = null, shippedAt = null, deliveredAt = null, returnedAt = null, cancelledAt = null
    if (['CONFIRMED','SHIPPED','DELIVERED','RETURNED','CANCELLED'].includes(status)) confirmedAt = new Date(createdAt.getTime() + 2*60*60*1000)
    if (['SHIPPED','DELIVERED','RETURNED'].includes(status)) shippedAt = new Date(createdAt.getTime() + 24*60*60*1000)
    if (status === 'DELIVERED') deliveredAt = new Date(createdAt.getTime() + 3*24*60*60*1000)
    if (status === 'RETURNED')  returnedAt  = new Date(createdAt.getTime() + 4*24*60*60*1000)
    if (status === 'CANCELLED') cancelledAt = new Date(createdAt.getTime() + 1*60*60*1000)

    const deliveryManId = ['SHIPPED','DELIVERED','RETURNED'].includes(status) ? pick(deliveryIds) : null

    await sql`
      INSERT INTO "Order" (
        "id","trackingNumber","sellerId","deliveryManId","assignedAgentId",
        "recipientName","phone","address","city","codAmount","status","source",
        "productCost","shippingCost","callCenterFee","platformFee",
        "confirmedAt","shippedAt","deliveredAt","returnedAt","cancelledAt",
        "createdAt","updatedAt"
      ) VALUES (
        ${orderId},${trackNum},${sellerId},${deliveryManId},${agentId},
        ${name},${phone},${address},${city},${codAmount},${status},'MANUAL',
        ${product.costPrice},${2000},${1500},${5000},
        ${confirmedAt},${shippedAt},${deliveredAt},${returnedAt},${cancelledAt},
        ${createdAt},${createdAt}
      )
    `

    // Order item
    const productId = productIds.find(pid => productDefs[productIds.indexOf(pid)]?.sku === product.sku) ?? productIds[i % productIds.length]
    await sql`
      INSERT INTO "OrderItem" ("id","orderId","productId","quantity","unitPrice")
      VALUES (${cuid()},${orderId},${productId},1,${codAmount})
    `

    // Order history entry
    await sql`
      INSERT INTO "OrderHistory" ("id","orderId","previousStatus","newStatus","changedById","createdAt")
      VALUES (${cuid()},${orderId},null,${status},${agentId},${createdAt})
    `

    orderCount++
  }

  console.log(`${orderCount} orders created.`)
  console.log('')
  console.log('=== SEED COMPLETE ===')
  console.log('Login credentials:')
  console.log('  ADMIN:       admin@gaboncod.com     / admin123')
  console.log('  AGENT 1:     merveille@gaboncod.com / agent123')
  console.log('  AGENT 2:     gisele@gaboncod.com    / agent123')
  console.log('  SELLER 1:    herve@gaboncod.com     / seller123')
  console.log('  DELIVERY:    rodrigue@gaboncod.com  / delivery123')
}

main().catch((e) => {
  console.error('Seed failed:', e)
  process.exit(1)
})
