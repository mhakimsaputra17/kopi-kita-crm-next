# ☕ Kopi Kita

**AI-powered CRM untuk kedai kopi.**

Kelola pelanggan, analisis segmen, dan buat kampanye promo yang ditargetkan — semua dibantu AI. Dibangun untuk pemilik kedai kopi (Mimi) yang ingin memahami pelanggannya lebih dalam dan meningkatkan penjualan lewat kampanye promo cerdas berbasis data.

---

## Daftar Isi

- [Tech Stack](#tech-stack)
- [Fitur Utama](#fitur-utama)
- [Arsitektur Sistem](#arsitektur-sistem)
- [Flow Aplikasi](#flow-aplikasi)
- [Struktur Projek](#struktur-projek)
- [Database Schema](#database-schema)
- [AI Tools (Chat Assistant)](#ai-tools-chat-assistant)
- [Setup & Instalasi](#setup--instalasi)
- [Cara Menjalankan & Testing](#cara-menjalankan--testing)
- [API Reference](#api-reference)
- [Deployment](#deployment)

---

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) + React 19 + TypeScript |
| **Styling** | Tailwind CSS 4 + shadcn/ui (30+ komponen) |
| **Database** | Prisma 7 ORM + PostgreSQL (Neon Serverless) |
| **Auth** | Better Auth (email/password, session cookie) |
| **AI/LLM** | OpenAI SDK — multi-provider via OpenAI-compatible API |
| **AI Providers** | GitHub Models (GPT-5, GPT-4.1, DeepSeek, Llama, Grok), Google Gemini, Groq |
| **Caching** | Upstash Redis (serverless HTTP-based) |
| **Rate Limiting** | Upstash Ratelimit (sliding window) |
| **State Management** | TanStack React Query v5 |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Notifications** | Sonner (toast) |
| **Dark Mode** | next-themes |

---

## Fitur Utama

### 1. Dashboard Analitik
- **KPI Cards**: total pelanggan, total tag minat, kampanye aktif, pesan terkirim
- **Grafik Minat**: bar chart distribusi minat pelanggan (Recharts)
- **Kampanye Terbaru**: 3 kampanye promo terakhir yang di-generate AI
- **Greeting dinamis**: sapaan berdasarkan waktu (pagi/siang/sore/malam)

### 2. Manajemen Pelanggan (CRUD)
- **Tabel interaktif** dengan pencarian real-time dan filter berdasarkan tag
- **Pagination** (10 pelanggan per halaman)
- **Form create/edit** dengan validasi Zod (nama, kontak, minuman favorit, tag minat)
- **Delete** dengan dialog konfirmasi
- **51+ data seed** pelanggan Indonesia dengan preferensi kopi

### 3. AI Chat Assistant
- **10 AI tools** untuk analisis data pelanggan secara real-time (lihat [AI Tools](#ai-tools-chat-assistant))
- **Multi-model support**: 14 model dari 6 provider (GPT-5, Gemini, Groq, dll)
- **Model selector**: pilih model AI langsung dari UI
- **Conversation persistence**: histori chat tersimpan di database
- **Sidebar histori**: rename, delete, navigasi antar percakapan
- **Streaming response**: output AI muncul bertahap (real-time)
- **Chain-of-thought display**: lihat proses "berpikir" AI
- **Tool calling**: AI otomatis query database untuk menjawab pertanyaan

### 4. AI Promo Generator
- **Generate 2-3 kampanye promo** berbasis data pelanggan riil
- **Structured output**: Zod validation memastikan format JSON yang konsisten
- **Multi-provider fallback**: Gemini → Groq → GitHub Models (11 model)
- **Pesan WhatsApp siap kirim** (copy-paste langsung)
- **Metadata**: model yang digunakan, waktu generasi, tag terpopuler

### 5. Keamanan & Reliability
- **Rate limiting**: 20 chat/10 menit, 5 promo/10 menit (per user)
- **Auth session**: 7 hari expiry, refresh otomatis setiap 24 jam
- **Input sanitization**: pertahanan terhadap prompt injection
- **Multi-LLM fallback**: jika satu provider gagal, otomatis coba provider lain

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 19)                      │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │Dashboard │  │Customers │  │ AI Chat  │  │Promo Generator│   │
│  │  Page    │  │  CRUD    │  │Assistant │  │   Page        │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘   │
│       │              │             │                │           │
│  React Query    Server Actions   Streaming API    Fetch API    │
└───────┼──────────────┼─────────────┼────────────────┼──────────┘
        │              │             │                │
┌───────┴──────────────┴─────────────┴────────────────┴──────────┐
│                     NEXT.JS APP ROUTER                          │
│                                                                 │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────────┐    │
│  │Server Actions│  │  API Routes   │  │    Middleware      │    │
│  │ (DB queries) │  │ /api/chat     │  │  (Auth check via   │    │
│  │              │  │ /api/promo    │  │   Better Auth)     │    │
│  │              │  │ /api/customers│  │                    │    │
│  └──────┬───────┘  └───────┬───────┘  └────────────────────┘   │
│         │                  │                                    │
└─────────┼──────────────────┼────────────────────────────────────┘
          │                  │
    ┌─────┴─────┐     ┌──────┴──────────────────────────────┐
    │           │     │         AI PROVIDER LAYER            │
    │  Prisma   │     │                                      │
    │  ORM      │     │  ┌─────────┐ ┌───────┐ ┌──────┐    │
    │           │     │  │ GitHub  │ │Google │ │ Groq │    │
    │           │     │  │ Models  │ │Gemini │ │      │    │
    │           │     │  │(GPT-5,  │ │(Flash)│ │(Llama│    │
    │           │     │  │DeepSeek,│ │       │ │ 3.3) │    │
    │           │     │  │Llama,..)│ │       │ │      │    │
    │           │     │  └─────────┘ └───────┘ └──────┘    │
    │           │     └─────────────────────────────────────┘
    │           │
┌───┴───┐  ┌───┴───┐
│Neon   │  │Upstash│
│Postgres│  │Redis  │
│(DB)   │  │(Cache │
│       │  │+Rate  │
│       │  │Limit) │
└───────┘  └───────┘
```

### Penjelasan Layer:

1. **Frontend Layer**: Halaman React dengan shadcn/ui, berkomunikasi via React Query (dashboard, customers) dan fetch API (chat streaming, promo generation)
2. **Server Layer**: Next.js App Router menangani routing, server actions untuk operasi database, API routes untuk AI dan auth
3. **AI Provider Layer**: OpenAI SDK sebagai wrapper universal, masing-masing provider punya endpoint berbeda tapi pakai interface yang sama. Fallback otomatis jika satu provider error
4. **Data Layer**: PostgreSQL (Neon) untuk data persisten, Redis (Upstash) untuk cache system prompt (60s TTL) dan rate limiting

---

## Flow Aplikasi

### Flow 1: Login → Dashboard

```
User buka /          User sudah login?
     │                     │
     ├── Ya ──────────→ Redirect ke /(dashboard)
     │                     │
     └── Tidak ────────→ Tampilkan halaman login
                           │
                      Isi email & password
                           │
                      Better Auth validasi
                           │
                      Set session cookie (7 hari)
                           │
                      Redirect ke Dashboard
                           │
                      Server Action: getDashboardStats()
                           │
                      Render: KPI Cards + Interest Chart + Recent Campaigns
```

### Flow 2: Manajemen Pelanggan

```
User buka /customers
     │
     ├── Tampilkan tabel pelanggan (page 1, 10/page)
     │
     ├── [Cari] → Input search → Server Action getCustomers({ search })
     │              → Update tabel real-time
     │
     ├── [Filter Tag] → Pilih tag → getCustomers({ tags: [...] })
     │                  → Tampilkan pelanggan dengan tag tersebut
     │
     ├── [+ Tambah] → /customers/new → Form dengan validasi Zod
     │                → Submit → createCustomer(data)
     │                → Redirect ke /customers
     │
     ├── [Edit ✏️] → /customers/[id] → Load data → Form pre-filled
     │              → Submit → updateCustomer(id, data)
     │
     └── [Hapus 🗑️] → Dialog konfirmasi → deleteCustomer(id)
                      → Refresh tabel
```

### Flow 3: AI Chat (Paling Kompleks)

```
User buka /chat
     │
     ├── Buat percakapan baru (POST /api/conversations)
     │   atau pilih dari sidebar histori
     │
     ├── Ketik pertanyaan, misal: "Siapa pelanggan yang suka matcha?"
     │
     ├── POST /api/chat
     │     │
     │     ├── 1. Auth check (requireSession)
     │     ├── 2. Rate limit check (20/10min per user)
     │     ├── 3. Input sanitization (anti prompt injection)
     │     ├── 4. Load system prompt (dari Redis cache atau build baru)
     │     │       └── Inject: total pelanggan, tag counts, top drinks, recent customers
     │     ├── 5. Trim conversation history (max 20 messages terakhir)
     │     ├── 6. Kirim ke AI model yang dipilih user
     │     │
     │     ├── 7. AI memutuskan: perlu panggil tool?
     │     │     │
     │     │     ├── Ya → AI panggil search_customers({ tag: "matcha" })
     │     │     │         → Query database via Prisma
     │     │     │         → Return hasil ke AI
     │     │     │         → AI format jawaban dengan data riil
     │     │     │
     │     │     └── Tidak → AI jawab langsung dari konteks
     │     │
     │     ├── 8. Stream response ke frontend (token per token)
     │     └── 9. Simpan pesan ke database (user + assistant)
     │
     └── Frontend render:
           ├── Markdown formatting (heading, bold, tabel, blockquote)
           ├── Chain-of-thought (collapsible thinking process)
           └── Tool call indicators
```

### Flow 4: AI Promo Generator

```
User buka /promo → Klik "Generate Promo Ideas"
     │
     ├── POST /api/promo/generate
     │     │
     │     ├── 1. Auth check
     │     ├── 2. Rate limit (5/10min)
     │     │
     │     ├── 3. Fetch semua data pelanggan
     │     │     ├── Count per tag: { "sweet drinks": 15, "matcha": 12, ... }
     │     │     └── Count per drink: { "Iced Latte": 8, "Cappuccino": 6, ... }
     │     │
     │     ├── 4. Build prompt dengan data di atas
     │     │
     │     ├── 5. Multi-provider fallback loop:
     │     │     │
     │     │     │  Coba model 1 (Gemini Flash Lite)
     │     │     │     ├── Berhasil? → Lanjut
     │     │     │     └── Gagal/truncated? → Coba model 2 (Groq Llama)
     │     │     │         ├── Berhasil? → Lanjut
     │     │     │         └── Gagal? → Coba model 3... dst (11 model)
     │     │     │
     │     │     └── Response format: JSON { campaigns: [...] }
     │     │
     │     ├── 6. Parse JSON (handle thinking tokens, markdown fences)
     │     ├── 7. Validasi Zod (2-3 campaigns, semua field wajib)
     │     │
     │     ├── 8. Simpan ke database:
     │     │     └── PromoBatch → PromoCampaign × 2-3
     │     │
     │     └── 9. Return: campaigns + metadata (model, timing, top tags)
     │
     └── Frontend render:
           ├── Card per campaign (theme, segment, customer count)
           ├── "Why Now" reasoning
           ├── Pesan WhatsApp siap copy
           └── Metadata: model digunakan, waktu generasi
```

---

## Struktur Projek

```
kopi-kita/
├── prisma/
│   ├── schema.prisma          # Database schema (8 tabel)
│   └── seed.ts                # Seed 51 pelanggan Indonesia
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── layout.tsx         # Root layout (fonts, providers, Toaster)
│   │   │
│   │   ├── (auth)/            # Route group: autentikasi
│   │   │   └── login/
│   │   │       └── page.tsx   # Form login email/password
│   │   │
│   │   ├── (dashboard)/       # Route group: halaman utama (perlu login)
│   │   │   ├── layout.tsx     # Dashboard shell (sidebar + header)
│   │   │   ├── page.tsx       # Dashboard: KPI, chart, campaigns
│   │   │   ├── loading.tsx    # Skeleton loader
│   │   │   │
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx        # Tabel pelanggan (search, filter, pagination)
│   │   │   │   ├── new/page.tsx    # Form tambah pelanggan baru
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # Form edit pelanggan
│   │   │   │       └── loading.tsx
│   │   │   │
│   │   │   ├── chat/
│   │   │   │   ├── page.tsx        # Chat baru (AI assistant)
│   │   │   │   └── [id]/page.tsx   # Buka percakapan tersimpan
│   │   │   │
│   │   │   └── promo/
│   │   │       └── page.tsx        # Generator promo AI
│   │   │
│   │   └── api/               # API endpoints
│   │       ├── auth/[...all]/route.ts    # Better Auth handler
│   │       ├── chat/route.ts             # AI chat (streaming + 10 tools)
│   │       ├── conversations/
│   │       │   ├── route.ts              # GET/POST conversations
│   │       │   └── [id]/route.ts         # PATCH/DELETE conversation
│   │       ├── customers/route.ts        # GET customers (search/filter)
│   │       ├── models/route.ts           # GET available AI models
│   │       └── promo/generate/route.ts   # POST generate promo campaigns
│   │
│   ├── actions/               # Server Actions (direct DB access)
│   │   ├── customer-actions.ts    # CRUD pelanggan
│   │   ├── dashboard-actions.ts   # Statistik dashboard
│   │   └── promo-actions.ts       # Save & fetch promo campaigns
│   │
│   ├── components/
│   │   ├── ai-elements/       # Custom AI chat UI components
│   │   │   ├── conversation.tsx       # Container percakapan
│   │   │   ├── message.tsx            # Bubble pesan (user/assistant)
│   │   │   ├── prompt-input.tsx       # Input chat dengan submit
│   │   │   ├── suggestion.tsx         # Saran pertanyaan
│   │   │   └── chain-of-thought.tsx   # Display proses berpikir AI
│   │   │
│   │   ├── chat/              # Chat page components
│   │   │   ├── chat-layout.tsx        # Layout: sidebar + content
│   │   │   ├── chat-content.tsx       # Area chat utama
│   │   │   ├── chat-sidebar.tsx       # Histori percakapan
│   │   │   └── model-selector.tsx     # Dropdown pilih model AI
│   │   │
│   │   ├── customers/         # Customer page components
│   │   │   ├── customer-table.tsx     # Tabel dengan search/filter
│   │   │   ├── customer-form.tsx      # Form create/edit
│   │   │   ├── tag-badge.tsx          # Visual tag badges
│   │   │   ├── delete-dialog.tsx      # Konfirmasi hapus
│   │   │   └── empty-state.tsx        # State kosong
│   │   │
│   │   ├── dashboard/         # Dashboard components
│   │   │   ├── kpi-cards.tsx          # 4 kartu metrik
│   │   │   ├── interest-chart.tsx     # Bar chart minat pelanggan
│   │   │   └── campaign-cards.tsx     # Kampanye terbaru
│   │   │
│   │   ├── promo/             # Promo page components
│   │   │   └── promo-ideas-content.tsx  # Tampilan hasil AI promo
│   │   │
│   │   ├── layout/            # Layout components
│   │   │   ├── dashboard-shell.tsx    # Shell: sidebar + header + content
│   │   │   ├── app-sidebar.tsx        # Navigasi + user profile
│   │   │   └── coffee-pattern.tsx     # Background dekoratif
│   │   │
│   │   ├── providers/         # React context providers
│   │   │   ├── theme-provider.tsx     # Dark/light mode (next-themes)
│   │   │   └── query-provider.tsx     # TanStack React Query
│   │   │
│   │   └── ui/                # shadcn/ui components (30+)
│   │       ├── button.tsx, input.tsx, dialog.tsx, form.tsx,
│   │       │   card.tsx, table.tsx, select.tsx, badge.tsx, ...
│   │       └── (komponen UI reusable)
│   │
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-customers.ts       # React Query hook: pelanggan
│   │   ├── use-click-outside.ts   # Tutup dropdown saat klik luar
│   │   ├── use-copy.ts            # Copy to clipboard
│   │   └── use-mobile.ts         # Deteksi viewport mobile
│   │
│   ├── lib/                   # Core utilities & config
│   │   ├── ai.ts              # Setup OpenAI clients (GitHub, Gemini, Groq)
│   │   ├── ai-models.ts       # Daftar 14 model AI + konfigurasi
│   │   ├── auth.ts            # Better Auth server config
│   │   ├── auth-client.ts     # Better Auth client (signIn, signUp, useSession)
│   │   ├── session.ts         # Helper: getServerSession, requireSession
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── redis.ts           # Upstash Redis client
│   │   ├── rate-limit.ts      # Rate limiters (chat: 20/10min, promo: 5/10min)
│   │   ├── prompts.ts         # System prompts untuk chat & promo
│   │   ├── constants.ts       # Tag styles, avatar gradients, filter tags
│   │   └── utils.ts           # cn() helper (clsx + tailwind-merge)
│   │
│   ├── schemas/               # Zod validation schemas
│   │   ├── customer.ts        # Validasi form pelanggan
│   │   └── promo.ts           # Validasi output promo AI
│   │
│   ├── types/                 # TypeScript type definitions
│   │
│   └── generated/             # Auto-generated Prisma client
│       └── prisma/
│
├── .env.example               # Template environment variables
├── package.json               # Dependencies & scripts
├── next.config.ts             # Next.js configuration
├── tsconfig.json              # TypeScript config
├── prisma.config.ts           # Prisma config
├── postcss.config.mjs         # PostCSS (Tailwind)
├── eslint.config.mjs          # ESLint config
└── components.json            # shadcn/ui config
```

---

## Database Schema

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     User     │     │   Session    │     │   Account    │
│──────────────│     │──────────────│     │──────────────│
│ id           │◄────│ userId       │     │ userId       │──►│
│ name         │     │ token        │     │ providerId   │
│ email        │     │ expiresAt    │     │ password     │
│ emailVerified│     │ ipAddress    │     │ accessToken  │
│ createdAt    │     │ userAgent    │     │              │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│ ChatConversation │
│──────────────────│
│ id               │
│ title            │
│ userId           │
│ createdAt        │
│ updatedAt        │
└───────┬──────────┘
        │ 1:N
        ▼
┌──────────────┐
│ ChatMessage  │
│──────────────│
│ id           │
│ conversationId│
│ role         │  ← "user" | "assistant"
│ content      │
│ createdAt    │
└──────────────┘

┌──────────────┐           ┌────────────────┐
│  PromoBatch  │           │ PromoCampaign  │
│──────────────│           │────────────────│
│ id           │──── 1:N ──│ batchId        │
│ createdAt    │           │ theme          │
└──────────────┘           │ segment        │
                           │ customerCount  │
                           │ whyNow         │
                           │ message        │  ← WhatsApp-ready text
                           │ timeWindow     │
                           └────────────────┘

┌──────────────┐
│   Customer   │
│──────────────│
│ id           │
│ name         │
│ contact      │
│ favoriteDrink│
│ interestTags │  ← PostgreSQL text[] (GIN index)
│ createdAt    │
│ updatedAt    │
└──────────────┘
```

**Catatan**: Tabel `User`, `Session`, `Account`, `Verification` di-manage oleh Better Auth. Tabel `Customer`, `PromoBatch`, `PromoCampaign`, `ChatConversation`, `ChatMessage` adalah tabel aplikasi.

---

## AI Tools (Chat Assistant)

Chat assistant memiliki **10 tools** yang bisa dipanggil otomatis berdasarkan pertanyaan user:

### Tools Analisis Data

| Tool | Fungsi | Contoh Pertanyaan |
|------|--------|-------------------|
| `get_customer_stats` | Statistik total: pelanggan, tag terpopuler, minuman favorit, pelanggan baru minggu ini | *"Berapa total pelanggan?"*, *"Statistik kedai"* |
| `search_customers` | Cari pelanggan berdasarkan nama, tag, atau minuman. Keyword "baru" = 7 hari terakhir | *"Siapa yang suka matcha?"*, *"Cari pelanggan bernama Andi"* |
| `analyze_segments` | Analisis mendalam per segmen: jumlah, top drinks, tag terkait, 5 pelanggan terbaru | *"Analisis segmen sweet drinks"*, *"Detail tag oat milk"* |
| `get_customer_growth` | Timeline pertumbuhan harian/mingguan dengan total kumulatif | *"Tren pelanggan baru"*, *"Growth minggu ini"* |
| `find_top_customers` | Ranking pelanggan berdasarkan engagement score (tags × 3 + tenure days) | *"Pelanggan paling loyal"*, *"Top customers"* |
| `compare_segments` | Perbandingan side-by-side: jumlah, minuman, overlap, ciri unik | *"Bandingkan matcha vs caramel"* |
| `get_drink_analysis` | Ranking minuman dengan customer count & tag terkait per minuman | *"Minuman terlaris"*, *"Analisis minuman"* |

### Tools Promo

| Tool | Fungsi | Contoh Pertanyaan |
|------|--------|-------------------|
| `generate_promo` | Generate 2-3 kampanye promo, simpan ke database, validasi Zod | *"Buatkan promo"*, *"Generate campaign"* |
| `get_promo_history` | Ambil histori batch promo terakhir (default: 5) | *"Promo apa saja yang sudah dibuat?"* |
| `suggest_new_promo` | Identifikasi segmen yang belum pernah ditarget promo | *"Segmen mana yang belum dipromo?"* |

---

## Setup & Instalasi

### Prasyarat

- [Bun](https://bun.sh/) (package manager & runtime)
- [PostgreSQL](https://neon.tech/) — rekomendasi: Neon (gratis, serverless)
- [Upstash Redis](https://console.upstash.com/) — gratis tier
- [GitHub Token](https://github.com/settings/tokens) — untuk GitHub Models API (needs `models:read`)

### 1. Clone & Install

```bash
git clone <repo-url>
cd kopi-kita
bun install
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env
```

Edit `.env` dan isi semua variabel:

```env
# Database — dari Neon dashboard (neon.tech)
DATABASE_URL="postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=verify-full&channel_binding=require"

# Auth secret — generate: openssl rand -base64 32
BETTER_AUTH_SECRET="your-secret-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# AI — GitHub Models tokens (multiple = more rate limit capacity)
GITHUB_TOKEN="your-github-token-here"
GITHUB_TOKEN_2="your-github-token-2-here"
GITHUB_TOKEN_3="your-github-token-3-here"

# AI — Google Gemini
GEMINI_API_KEY="your-gemini-api-key-here"

# Redis — dari Upstash console (console.upstash.com)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token-here"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Seed User (dipakai oleh: bun run db:seed)
SEED_USER_NAME="Mimi"
SEED_USER_EMAIL="mimi@kopikita.com"
SEED_USER_PASSWORD="your-seed-password-here"
```

#### Cara Mendapatkan Credentials

| Service | Cara Mendapatkan | URL |
|---------|-----------------|-----|
| **Neon Postgres** | Daftar → Create project → Copy connection string | [neon.tech](https://neon.tech) |
| **Upstash Redis** | Daftar → Create database → Copy REST URL & token | [console.upstash.com](https://console.upstash.com) |
| **GitHub Token** | Settings → Developer Settings → Personal Access Tokens → Generate (centang `models:read`). Buat 3 token untuk load balancing | [github.com/settings/tokens](https://github.com/settings/tokens) |
| **Google Gemini** | Daftar → Create API key | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Auth Secret** | Jalankan: `openssl rand -base64 32` | Terminal lokal |

### 3. Setup Database

```bash
# Generate Prisma client
bun run db:generate

# Push schema ke database (buat semua tabel)
bun run db:push

# Seed data pelanggan (51 pelanggan Indonesia)
bun run db:seed
```

### 4. Jalankan

```bash
bun dev
```

Buka [http://localhost:3000](http://localhost:3000)

---

## Cara Menjalankan & Testing

### Login

Setelah `bun run db:seed`, gunakan akun default:

```
Email:    mimi@kopikita.com
Password: (lihat di prisma/seed.ts)
```

> **Catatan**: Jika seed tidak membuat user, daftar akun baru lewat form login.

### Test Fitur: Dashboard

1. Buka `/` setelah login
2. Pastikan KPI cards menampilkan angka (total pelanggan, tag, dll)
3. Grafik "Minat Pelanggan" harus terisi bar chart
4. Scroll ke bawah untuk lihat kampanye terbaru (kosong jika belum generate)

### Test Fitur: Manajemen Pelanggan

1. Buka `/customers`
2. **Search**: Ketik nama di search bar → tabel filter real-time
3. **Filter tag**: Klik tag filter → tabel update sesuai tag
4. **Tambah**: Klik "Tambah Pelanggan" → isi form → Submit
5. **Edit**: Klik ikon edit di baris pelanggan → ubah data → Save
6. **Hapus**: Klik ikon delete → konfirmasi di dialog → pelanggan terhapus
7. **Pagination**: Navigasi halaman di bawah tabel

### Test Fitur: AI Chat

1. Buka `/chat`
2. Pilih model AI dari dropdown (default: GPT-5 Mini)
3. Coba pertanyaan-pertanyaan ini:

```
"Berapa total pelanggan kita?"
→ AI panggil get_customer_stats, tampilkan statistik

"Siapa saja pelanggan yang suka matcha?"
→ AI panggil search_customers, tampilkan list dalam tabel

"Bandingkan segmen sweet drinks vs black coffee"
→ AI panggil compare_segments, tampilkan perbandingan

"Buatkan promo untuk pelanggan weekend vibes"
→ AI panggil generate_promo, tampilkan kampanye

"Segmen mana yang belum pernah dipromo?"
→ AI panggil suggest_new_promo, berikan rekomendasi

"Minuman apa yang paling laris?"
→ AI panggil get_drink_analysis, tampilkan ranking
```

4. **Sidebar**: Lihat histori percakapan di kiri, klik untuk buka
5. **Rename**: Hover percakapan → klik rename → ubah judul
6. **Delete**: Hover percakapan → klik delete → percakapan terhapus

### Test Fitur: Promo Generator

1. Buka `/promo`
2. Klik "Generate Promo Ideas"
3. Tunggu AI generate (bisa 5-15 detik, tergantung model)
4. Hasil: 2-3 kartu kampanye masing-masing berisi:
   - **Tema**: Nama campaign
   - **Target segmen**: Grup pelanggan yang ditarget + jumlah
   - **Why Now**: Alasan kenapa promo ini relevan sekarang
   - **Pesan WhatsApp**: Siap copy-paste, ada tombol copy
   - **Time Window**: Kapan promo berlaku
5. Generate lagi untuk mendapat ide berbeda (max 5 per 10 menit)

### Test Rate Limiting

- Chat: Kirim >20 pesan dalam 10 menit → akan muncul error 429 "Terlalu banyak request"
- Promo: Generate >5 kali dalam 10 menit → akan muncul error & timer retry

### Test Dark Mode

- Klik toggle theme di header (sun/moon icon)
- Semua halaman mendukung dark mode

---

## API Reference

### `POST /api/chat`

AI chat dengan streaming response dan tool calling.

| Parameter | Tipe | Deskripsi |
|-----------|------|-----------|
| `messages` | `Message[]` | Array pesan (role + content) |
| `modelId` | `string` | ID model AI (opsional, default: gpt-5-mini) |
| `conversationId` | `string` | ID percakapan (opsional) |

**Response**: Server-Sent Events (streaming text)

### `POST /api/promo/generate`

Generate kampanye promo berbasis data pelanggan.

**Response**:
```json
{
  "campaigns": [
    {
      "theme": "Matcha Monday Madness",
      "segment": "matcha",
      "customerCount": 12,
      "whyNow": "12 pelanggan matcha rutin datang Senin pagi",
      "message": "☕ Halo! Matcha Latte special hari ini — Buy 1 Get 1! Yuk mampir 🍵",
      "timeWindow": "Senin, 08:00-12:00"
    }
  ],
  "totalCustomers": 51,
  "topTags": [{ "tag": "sweet drinks", "count": 15 }],
  "model": "gemini-2.5-flash-lite",
  "generatedAt": "2026-03-04T10:00:00.000Z"
}
```

### `GET /api/customers?search=&tags[]=&page=1&pageSize=10`

List pelanggan dengan filter.

### `GET /api/models`

Daftar model AI yang tersedia (14 model).

### `GET/POST /api/conversations`

List atau buat percakapan baru.

### `PATCH/DELETE /api/conversations/:id`

Rename atau hapus percakapan.

---

## Scripts

| Script | Keterangan |
|--------|-----------|
| `bun dev` | Jalankan development server |
| `bun run build` | Build untuk production |
| `bun start` | Jalankan production build |
| `bun run lint` | Cek kode dengan ESLint |
| `bun run db:generate` | Generate Prisma client dari schema |
| `bun run db:push` | Push schema ke database (tanpa migration) |
| `bun run db:migrate` | Jalankan Prisma migration |
| `bun run db:seed` | Seed data awal (51 pelanggan) |
| `bun run db:studio` | Buka Prisma Studio (GUI database) |

---

## Deployment

### Deploy ke Vercel

1. Push kode ke GitHub
2. Buat project baru di [Vercel](https://vercel.com)
3. Set environment variables di Vercel dashboard (semua variabel dari `.env`)
4. Deploy otomatis dari branch `main`

### Environment Variables untuk Production

```env
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="..."
BETTER_AUTH_URL="https://your-domain.vercel.app"
GITHUB_TOKEN="ghp_..."
GITHUB_TOKEN_2="ghp_..."
GITHUB_TOKEN_3="ghp_..."
GEMINI_API_KEY="AIza..."
UPSTASH_REDIS_REST_URL="https://..."
UPSTASH_REDIS_REST_TOKEN="..."
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"
SEED_USER_NAME="Mimi"
SEED_USER_EMAIL="mimi@kopikita.com"
SEED_USER_PASSWORD="..."
```

> **Penting**: Ubah `BETTER_AUTH_URL` dan `NEXT_PUBLIC_APP_URL` ke domain production.

---

## Lisensi

Private project — Kopi Kita ☕
