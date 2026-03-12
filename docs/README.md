# Gabon COD Platform

A comprehensive Cash on Delivery (COD) platform for the Gabon market, built with modern technologies for efficient order management, delivery tracking, and financial reconciliation.

## Technology Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Prisma** - Database ORM
- **PostgreSQL** - Production database (Vercel Postgres)
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - UI components
- **Lucide React** - Icons

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Database Setup

The project uses PostgreSQL. The database URL is configured in `.env`:

```env
DATABASE_URL=your_database_url_here
```

### Seed the Database

To populate the database with the Gabon COD scenario data:

```bash
npx tsx prisma/seed.ts
```

This creates:
- 1 Admin account
- 5 Seller accounts with products and stock
- 2 Call Center agents
- 3 Delivery agents
- 236 orders in various statuses

## Login Credentials

After seeding, use these credentials:

| Role | Email | Password |
|------|--------|----------|
| Admin | admin@gaboncod.com | admin123 |
| Seller | herve@gaboncod.com | seller123 |
| Seller | chancelle@gaboncod.com | seller123 |
| Seller | patrick@gaboncod.com | seller123 |
| Seller | laure@gaboncod.com | seller123 |
| Seller | joel@gaboncod.com | seller123 |
| Call Center | merveille@gaboncod.com | agent123 |
| Call Center | gisele@gaboncod.com | agent123 |
| Delivery | jeanclaude@gaboncod.com | delivery123 |
| Delivery | rodrigue@gaboncod.com | delivery123 |
| Delivery | serge@gaboncod.com | delivery123 |

## Features by Role

### Admin
- View all orders across all sellers
- Manage users and roles
- View analytics and reports
- Manage stock and inventory
- Handle finance and payouts
- Configure system settings

### Seller
- View own orders and their status
- Import orders (CSV, Google Sheets)
- Manage products and stock
- Track wallet balance
- Request payouts
- View sourcing requests

### Call Center
- View pending orders queue
- Confirm orders by phone
- Log call attempts
- Schedule callbacks
- Track performance metrics

### Delivery Agent
- View assigned orders
- Track cash collected
- Update delivery status
- Capture POD photos/signatures
- View delivery routes

## Project Structure

```
gabon-cod-platform/
├── docs/                  # Documentation files
│   ├── README.md         # Main documentation
│   ├── DEPLOYMENT.md     # Deployment guide
│   ├── STAFF.md         # Staff list & credentials
│   ├── TODO_BACKEND.md  # Backend tasks
│   └── TODO_FRONTEND.md # Frontend tasks
├── scripts/               # Python utility scripts
│   ├── add_metadata.py
│   └── generate_proposal.py
├── src/
│   ├── app/             # Next.js App Router pages
│   │   ├── (auth)/      # Authentication pages
│   │   ├── (dashboard)/ # Dashboard pages by role
│   │   └── api/        # API routes
│   ├── components/      # React components
│   │   ├── layout/     # Dashboard layout components
│   │   ├── ui/         # shadcn/ui components
│   │   ├── call-center/# Call center components
│   │   ├── delivery/   # Delivery components
│   │   └── orders/     # Order components
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and services
│   │   ├── auth.ts     # Authentication utilities
│   │   ├── db.ts       # Prisma client
│   │   └── utils.ts    # Helper functions
│   └── types/           # TypeScript type definitions
│       └── auth-types.ts
├── prisma/
│   ├── schema.prisma    # Database schema
│   ├── seed.ts         # Main seed data
│   └── seeds/          # Additional seed files
└── mini-services/       # Micro-service modules
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema changes to database
```

## Environment Variables

See `.env.example` for required variables:

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `TWILIO_ACCOUNT_SID` - Twilio account (optional, for SMS)
- `PUSHER_*` - Pusher configuration (optional, for real-time)

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Gabon Market Scenario

This platform simulates a real COD operation in Gabon with:
- 5 sellers operating in Libreville, Port-Gentil, Franceville, and Oyem
- Realistic order confirmation and delivery rates
- Multi-agent call center operations
- Zone-based delivery assignments

For detailed staff and product information, see [STAFF.md](./STAFF.md).

## License

MIT
