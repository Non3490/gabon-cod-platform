/**
 * Gabon COD Platform — Full DB Setup + Seed Script (plain JS, no TS)
 */

import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
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
    CREATE TABLE IF NOT EXISTS "Expense" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT REFERENCES "User"("id"),
      "agentId" TEXT REFERENCES "User"("id"),
      "orderId" TEXT UNIQUE REFERENCES "Order"("id"),
      "category" TEXT NOT NULL,
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
      "cycleType" TEXT NOT NULL DEFAULT 'SELLER',
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
    CREATE TABLE IF NOT EXISTS "ApiKey" (
      "id" TEXT PRIMARY KEY,
      "sellerId" TEXT UNIQUE NOT NULL REFERENCES "User"("id"),
      "key" TEXT UNIQUE NOT NULL,
      "lastUsedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
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

  console.log('All tables created.')
}

async function main() {
  console.log('=== Gabon COD Platform — DB Setup + Seed ===')

  await createTables()

  // Hash passwords
  console.log('Hashing passwords...')
  const pwAdmin    = await bcrypt.hash('admin123', 12)
  const pwSeller   = await bcrypt.hash('seller123', 12)
  const pwAgent    = await bcrypt.hash('agent123', 12)
  const pwDelivery = await bcrypt.hash('delivery123', 12)
  console.log('Passwords hashed.')

  // Clear existing data
  console.log('Clearing old data...')
  for (const tbl of [
    'ActivityLog','WalletTransaction','WithdrawalRequest','Wallet',
    'OrderHistory','CallLog','OrderItem','Order',
    'StockMovement','Stock','Product','AgentSession','User'
  ]) {
    await sql(`DELETE FROM "${tbl}"`)
  }
  console.log('Cleared.')

  // ── ADMIN ──────────────────────────────────────────────────────
  const adminId = cuid()
  await sql`
    INSERT INTO "User" ("id","email","password","name","phone","role","isActive","createdAt")
    VALUES (${adminId},'admin@gaboncod.com',${pwAdmin},'Admin Gabon COD','+241 077 00 00 00','ADMIN',true,NOW())
  `
  console.log('Admin created: admin@gaboncod.com / admin123')

  // ── CALL CENTER AGENTS ─────────────────────────────────────────
  const agentProfiles = [
    { name: 'Merveille Nkoghe', email: 'merveille@gaboncod.com' },
    { name: 'Gisèle Ondo',      email: 'gisele@gaboncod.com' },
  ]
  const agentIds = []
  for (const a of agentProfiles) {
    const id = cuid()
    agentIds.push(id)
    await sql`
      INSERT INTO "User" ("id","email","password","name","phone","role","isActive","createdAt")
      VALUES (${id},${a.email},${pwAgent},${a.name},${randomPhone()},'CALL_CENTER_AGENT',true,NOW())
    `
  }
  console.log('Call center agents created: merveille@gaboncod.com, gisele@gaboncod.com / agent123')

  // ── SELLERS ────────────────────────────────────────────────────
  const sellerProfiles = [
    { name: 'Hervé Bounguendza', email: 'herve@gaboncod.com' },
    { name: 'Chancelle Mba',     email: 'chancelle@gaboncod.com' },
    { name: 'Patrick Koumba',    email: 'patrick@gaboncod.com' },
    { name: 'Laure Mintsa',      email: 'laure@gaboncod.com' },
    { name: 'Joël Nguema',       email: 'joel@gaboncod.com' },
  ]
  const sellerIds = []
  for (const s of sellerProfiles) {
    const id = cuid()
    sellerIds.push(id)
    await sql`
      INSERT INTO "User" ("id","email","password","name","phone","role","isActive","createdAt")
      VALUES (${id},${s.email},${pwSeller},${s.name},${randomPhone()},'SELLER',true,NOW())
    `
  }
  console.log('Sellers created.')

  // ── DELIVERY MEN ───────────────────────────────────────────────
  const deliveryProfiles = [
    { name: 'Romuald Ella',    email: 'romuald@gaboncod.com' },
    { name: 'Freddy Mboumba', email: 'freddy@gaboncod.com' },
    { name: 'Steeve Nzamba',  email: 'steeve@gaboncod.com' },
  ]
  const deliveryIds = []
  for (const d of deliveryProfiles) {
    const id = cuid()
    deliveryIds.push(id)
    await sql`
      INSERT INTO "User" ("id","email","password","name","phone","role","isActive","createdAt")
      VALUES (${id},${d.email},${pwDelivery},${d.name},${randomPhone()},'DELIVERY_MAN',true,NOW())
    `
  }
  console.log('Delivery men created.')

  // ── PRODUCTS ───────────────────────────────────────────────────
  const productDefs = [
    { sku: 'SLIM-BELT-001', name: 'Ceinture Minceur Chauffante', costPrice: 8000,  sellPrice: 25000 },
    { sku: 'SKIN-CREME-02', name: 'Crème Éclaircissante Naturelle', costPrice: 5000, sellPrice: 18000 },
    { sku: 'HAIR-OIL-003',  name: 'Huile de Croissance Capillaire', costPrice: 6000, sellPrice: 20000 },
    { sku: 'BLENDER-004',   name: 'Mini Blender Portable USB', costPrice: 12000, sellPrice: 35000 },
    { sku: 'MASSAGER-005',  name: 'Masseur Électrique Cervical', costPrice: 15000, sellPrice: 45000 },
  ]
  const products = []
  for (const s of sellerIds) {
    for (const p of productDefs) {
      const id = cuid()
      await sql`
        INSERT INTO "Product" ("id","sellerId","sku","name","costPrice","sellPrice","isActive","createdAt")
        VALUES (${id},${s},${p.sku},${p.name},${p.costPrice},${p.sellPrice},true,NOW())
      `
      // Stock
      const stockId = cuid()
      const qty = Math.floor(Math.random() * 200 + 50)
      await sql`
        INSERT INTO "Stock" ("id","productId","sellerId","warehouse","quantity","alertLevel","updatedAt")
        VALUES (${stockId},${id},${s},'Entrepôt Libreville',${qty},10,NOW())
      `
      products.push({ id, sellerId: s, sellPrice: p.sellPrice, costPrice: p.costPrice })
    }
  }
  console.log('Products + stock created.')

  // ── WALLETS ────────────────────────────────────────────────────
  const walletMap = {}
  for (const sid of sellerIds) {
    const wid = cuid()
    walletMap[sid] = wid
    await sql`
      INSERT INTO "Wallet" ("id","sellerId","balance","totalEarned","totalDeducted","updatedAt")
      VALUES (${wid},${sid},0,0,0,NOW())
    `
  }

  // ── ORDERS ─────────────────────────────────────────────────────
  console.log('Creating orders...')
  let orderCount = 0
  const totalOrders = 236

  for (let i = 0; i < totalOrders; i++) {
    const sellerId   = pick(sellerIds)
    const agentId    = pick(agentIds)
    const deliveryId = pick(deliveryIds)
    const status     = pickStatus()
    const city       = weightedCity()
    const address    = randomAddress(city)
    const name       = pick(GABONESE_NAMES)
    const phone      = randomPhone()
    const daysBack   = Math.floor(Math.random() * 90)
    const createdAt  = daysAgo(daysBack)
    const product    = products.filter(p => p.sellerId === sellerId)[Math.floor(Math.random() * productDefs.length)]
    const cod        = product ? product.sellPrice : 25000
    const trackNum   = `GCO-${Date.now()}-${String(i).padStart(4,'0')}`
    const orderId    = cuid()

    const confirmedAt  = ['CONFIRMED','SHIPPED','DELIVERED'].includes(status) ? daysAgo(daysBack - 1) : null
    const shippedAt    = ['SHIPPED','DELIVERED'].includes(status) ? daysAgo(daysBack - 2) : null
    const deliveredAt  = status === 'DELIVERED' ? daysAgo(daysBack - 3) : null
    const returnedAt   = status === 'RETURNED'  ? daysAgo(daysBack - 3) : null
    const cancelledAt  = status === 'CANCELLED' ? daysAgo(daysBack - 1) : null

    await sql`
      INSERT INTO "Order" (
        "id","trackingNumber","sellerId","deliveryManId","assignedAgentId",
        "recipientName","phone","address","city","codAmount","status","source",
        "callAttempts","priority","productCost","shippingCost","callCenterFee","platformFee","adSpend",
        "confirmedAt","shippedAt","deliveredAt","returnedAt","cancelledAt",
        "createdAt","updatedAt"
      ) VALUES (
        ${orderId},${trackNum},${sellerId},${deliveryId},${agentId},
        ${name},${phone},${address},${city},${cod},${status},'MANUAL',
        ${Math.floor(Math.random() * 3)},${Math.floor(Math.random() * 3)},
        ${product ? product.costPrice : 8000},2000,1500,5000,0,
        ${confirmedAt},${shippedAt},${deliveredAt},${returnedAt},${cancelledAt},
        ${createdAt},${createdAt}
      )
    `

    // OrderItem
    if (product) {
      await sql`
        INSERT INTO "OrderItem" ("id","orderId","productId","quantity","unitPrice")
        VALUES (${cuid()},${orderId},${product.id},1,${product.sellPrice})
      `
    }

    // OrderHistory
    await sql`
      INSERT INTO "OrderHistory" ("id","orderId","previousStatus","newStatus","changedById","createdAt")
      VALUES (${cuid()},${orderId},null,'NEW',${adminId},${createdAt})
    `
    if (status !== 'NEW') {
      await sql`
        INSERT INTO "OrderHistory" ("id","orderId","previousStatus","newStatus","changedById","createdAt")
        VALUES (${cuid()},${orderId},'NEW',${status},${agentId},${new Date(createdAt.getTime() + 3600000)})
      `
    }

    orderCount++
    if (orderCount % 50 === 0) console.log(`  ${orderCount}/${totalOrders} orders inserted...`)
  }

  console.log(`${totalOrders} orders created.`)
  console.log('')
  console.log('=== SEED COMPLETE ===')
  console.log('')
  console.log('Login credentials:')
  console.log('  ADMIN:            admin@gaboncod.com      / admin123')
  console.log('  CALL CENTER:      merveille@gaboncod.com  / agent123')
  console.log('  CALL CENTER:      gisele@gaboncod.com     / agent123')
  console.log('  SELLER:           herve@gaboncod.com      / seller123')
}

main().catch(err => {
  console.error('Seed failed:', err)
  process.exit(1)
})
