# ♟️ Chess Mastery — AI Chess Coach & Mastery Platform

A full-stack, intelligent chess training platform powered by **Stockfish 19 WebAssembly**, **PostgreSQL**, and **LLM-driven AI Coaching** (Groq / Gemini) with RAG (Retrieval-Augmented Generation) and adaptive player memory.

---

## 🏗️ Architecture & Directory Layout

The repository is organized cleanly as a monorepo with separated backend and frontend applications:

```
Chess Mastery/
├── backend/                   # Node.js / Express / TypeScript / Prisma
│   ├── prisma/                # Prisma schema, migrations, and seeds (curriculum, puzzles, RAG)
│   ├── src/
│   │   ├── controllers/       # Auth, Coach, Curriculum, Practice, Player APIs
│   │   ├── services/          # RAG, LLM providers (Groq/Gemini), Engine, Player Memory
│   │   ├── middlewares/       # Auth session guard, validation
│   │   └── server.ts          # Express API server entry
│   ├── tests/                 # Comprehensive Vitest suite (228+ unit & integration tests)
│   ├── .env.example           # Backend environment configuration template
│   └── package.json
│
├── frontend/                  # React 19 / Vite / Tailwind CSS / TypeScript
│   ├── public/                # Assets, Stockfish 19 WASM web worker binaries
│   ├── src/
│   │   ├── auth/              # Auth context & Protected route guards
│   │   ├── components/        # Chessboard, Coach Panel, Game Review, Evaluation Bar
│   │   ├── pages/             # Play, Learn, Practice, Puzzles, Analyze, Profile
│   │   ├── services/          # Real Backend REST API client & Stockfish WASM engine
│   │   └── types/             # Domain TypeScript interfaces
│   ├── e2e-verification.spec.ts # End-to-end Playwright test suite
│   ├── .env.example           # Frontend environment configuration template
│   └── package.json
│
├── deployment/                # Production Docker configurations & reverse proxy
│   ├── docker-compose.prod.yml
│   └── nginx.conf
│
├── package.json               # Root workspace scripts (run both frontend and backend)
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js** (v18 or v20+ recommended)
- **PostgreSQL** (v14+ running locally on port `5432` or via cloud provider)

### 2. Environment Setup

#### Backend:
Copy the backend example environment file and configure your database and LLM API keys:
```bash
cp backend/.env.example backend/.env
```
Key backend variables:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chess_coach?schema=public"
CLIENT_URL="http://localhost:5173"
LLM_PROVIDER=groq # 'groq' | 'gemini' | 'mock'
LLM_API_KEY=your_groq_or_gemini_api_key
LLM_MODEL=llama-3.3-70b-versatile
```

#### Frontend:
Copy the frontend example environment file:
```bash
cp frontend/.env.example frontend/.env
```
Key frontend variables:
```env
VITE_DATA_MODE=api
VITE_API_URL=http://localhost:5000/api
```

---

### 3. Database Migration & Seeding

From the root directory:
```bash
# Generate Prisma client and apply migrations
npm run prisma:migrate

# Seed curriculum, lessons, tactical puzzles, and dev user (dev@chesscoach.local / test123)
npm run prisma:seed

# Seed the RAG chess knowledge base (openings, endgame principles, tactical themes)
npm run knowledge:seed
```

---

### 4. Running the Development Servers

You can start both backend and frontend from the root:

```bash
# Terminal 1: Backend API (runs on http://localhost:5000)
npm run dev:backend

# Terminal 2: Frontend App (runs on http://localhost:5173)
npm run dev:frontend
```

---

## 🧪 Testing

The platform features comprehensive test coverage across both unit, integration, and end-to-end layers:

```bash
# Run all unit & integration tests (Backend: 228 tests, Frontend: 48 tests)
npm test

# Run backend tests only
npm run test:backend

# Run frontend tests only
npm run test:frontend

# Run end-to-end Playwright verification suite
npm run test:e2e
```

---

## 🚀 Production Deployment (Docker Compose)

A production-ready Docker Compose configuration is available in `deployment/`:

```bash
cd deployment
docker compose -f docker-compose.prod.yml up -d --build
```
This builds and launches:
1. `backend`: Express TypeScript API with auto-applied migrations.
2. `frontend`: Multi-stage static build served with NGINX reverse-proxying `/api` requests to backend.
3. `postgres`: Production PostgreSQL database with persistent volume.

---

## 🛡️ License

MIT License. Designed and engineered for chess mastery.
