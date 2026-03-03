# ☕ Kopi Kita

AI-powered CRM untuk kedai kopi. Kelola pelanggan, analisis segmen, dan buat kampanye promo yang ditargetkan — semua dibantu AI.

## Tech Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + shadcn/ui
- **Prisma 7** + PostgreSQL (Neon)
- **Better Auth** (email/password)
- **OpenAI SDK** — multi-model via OpenAI-compatible API (GitHub Models, Google Gemini, Groq)
- **Upstash Redis** — rate limiting & caching

## Fitur Utama

- **Dashboard** — KPI, grafik minat pelanggan, insight AI
- **Manajemen Pelanggan** — cari, filter, dan kelola data pelanggan
- **AI Promo Generator** — buat kampanye promo bertarget dengan AI (structured output + Zod validation)
- **Chat Assistant** — asisten AI interaktif untuk analisis bisnis (statistik, segmentasi, tren pertumbuhan)
- **Multi-LLM Fallback** — Google Gemini → Groq → GitHub Models untuk keandalan

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Konfigurasi environment

Salin `.env.example` ke `.env` dan isi variabel berikut:

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="http://localhost:3000"
GITHUB_TOKEN="ghp_..."
GEMINI_API_KEY="AIza..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
```

### 3. Setup database

```bash
bun run db:generate
bun run db:push
bun run db:seed
```

### 4. Jalankan

```bash
bun dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Keterangan |
|---|---|
| `bun dev` | Development server |
| `bun run build` | Build production |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:push` | Push schema ke database |
| `bun run db:seed` | Seed data awal |
| `bun run db:studio` | Buka Prisma Studio |

## Struktur Projek

```
src/
├── app/              # Routes (App Router)
│   ├── (auth)/       # Login
│   ├── (dashboard)/  # Dashboard, customers, promo, chat
│   └── api/          # API endpoints
├── actions/          # Server actions
├── components/       # React components (UI, chat, dashboard)
├── lib/              # Utilities (AI, auth, DB, redis)
├── schemas/          # Zod validation schemas
├── hooks/            # React hooks
└── types/            # TypeScript types
```

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
