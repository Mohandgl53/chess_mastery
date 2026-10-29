# 🚀 Quick Start Guide — Chess Mastery

Welcome to **Chess Mastery**! This guide walks you through setting up and running the entire application on your local machine from scratch after cloning this repository.

---

## 📋 System Prerequisites

Before starting, ensure your system has the following installed:

1. **Node.js** (v18.0.0 or higher, v20+ recommended)
   - Verify with: `node -v` and `npm -v`
2. **PostgreSQL** (v14 or higher running on port `5432`)
   - Alternatively, you can use Docker to spin up a PostgreSQL instance.
3. **Git**
   - Verify with: `git --version`

---

## 🛠️ Step-by-Step Local Setup

### Step 1: Clone the Repository

Open your terminal and clone the repository:

```bash
git clone https://github.com/Mohandgl53/chess_mastery.git
cd chess_mastery
```

---

### Step 2: Install Dependencies

Install root and workspace dependencies for both the frontend and backend:

```bash
# 1. Install root dependencies
npm install

# 2. Install backend dependencies
cd backend
npm install
cd ..

# 3. Install frontend dependencies
cd frontend
npm install
cd ..
```

---

### Step 3: Configure Environment Variables

The project includes pre-configured `.env.example` templates for both frontend and backend.

#### A. Backend Configuration (`backend/.env`)

Create `backend/.env` from `backend/.env.example`:

**On Windows (PowerShell):**
```powershell
Copy-Item backend/.env.example backend/.env
```
**On macOS / Linux:**
```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` in your code editor. Ensure the database connection and LLM settings match your setup:

```env
PORT=5000
NODE_ENV=development

# PostgreSQL connection string: postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chess_coach?schema=public"

# Allowed client URL (Vite dev server)
CLIENT_URL="http://localhost:5173"

# LLM Provider for the AI Chess Coach
# Options: 'groq' | 'gemini' | 'mock' (mock requires no API key and works offline)
LLM_PROVIDER=groq
LLM_API_KEY=your_groq_api_key_here
LLM_MODEL=llama-3.3-70b-versatile

# If using Gemini instead:
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=your_gemini_api_key_here
# LLM_MODEL=gemini-1.5-flash
```

> 💡 **Tip:** If you do not have a Groq or Gemini API key right now, set `LLM_PROVIDER=mock`. The AI coach will work offline with pre-defined deterministic chess coaching responses.

#### B. Frontend Configuration (`frontend/.env`)

Create `frontend/.env` from `frontend/.env.example`:

**On Windows (PowerShell):**
```powershell
Copy-Item frontend/.env.example frontend/.env
```
**On macOS / Linux:**
```bash
cp frontend/.env.example frontend/.env
```

The frontend defaults to:
```env
VITE_DATA_MODE=api
VITE_API_URL=http://localhost:5000/api
```

---

### Step 4: Initialize the Database (Migrations & Seeders)

Make sure your PostgreSQL server is running, and create a database named `chess_coach` (or the name you specified in `DATABASE_URL`):

```sql
CREATE DATABASE chess_coach;
```

From the **root folder**, run the following commands to generate the Prisma client, apply database migrations, and seed initial curriculum, tactical puzzles, and RAG chess knowledge:

```bash
# 1. Generate Prisma client & apply database migrations
npm run prisma:migrate

# 2. Seed curriculum lessons, tactical drills, and the default dev user
npm run prisma:seed

# 3. Seed the RAG vector knowledge base (tactical patterns, endgame principles)
npm run knowledge:seed
```

*(You will see output confirming 4 modules, 11 lessons, 25 steps, 13 verified tactical puzzles, and 34 knowledge chunks seeded successfully.)*

---

### Step 5: Start the Development Servers

Open two terminal tabs from the **root directory**:

#### Terminal 1 — Backend API:
```bash
npm run dev:backend
```
*(Starts the Node.js API server on [http://localhost:5000](http://localhost:5000))*

#### Terminal 2 — Frontend Application:
```bash
npm run dev:frontend
```
*(Starts the Vite dev server on [http://localhost:5173](http://localhost:5173))*

---

### Step 6: Open the App & Log In

1. Open your browser and navigate to: **[http://localhost:5173](http://localhost:5173)**
2. You can either register a new account or sign in with the pre-seeded developer account:
   - **Email:** `dev@chesscoach.local`
   - **Password:** `test123`
3. Enjoy playing with Stockfish 19, practicing tactical drills, taking curriculum masterclasses, and chatting with the AI Chess Coach!

---

## 🧪 Running Tests

To verify that everything is working properly on your system:

```bash
# Run all backend unit & integration tests (228 tests)
npm run test:backend

# Run frontend tests (48 tests)
npm run test:frontend

# Run all tests together
npm test
```

---

## 🐳 Alternative: Running with Docker (No Local Node or Postgres needed)

If you have Docker and Docker Compose installed, you can launch the complete full-stack environment with a single command:

```bash
cd deployment
docker compose -f docker-compose.prod.yml up --build
```

- Web App: [http://localhost](http://localhost) (Port 80)
- API Health Check: [http://localhost/api/health](http://localhost/api/health)

---

## ❓ Common Troubleshooting

1. **`Database does not exist` or `Connection refused on port 5432`**:
   - Verify PostgreSQL is running:
     - Windows: Check `services.msc` for PostgreSQL service.
     - Linux / macOS: `sudo systemctl status postgresql` or `brew services list`.
   - Ensure the database `chess_coach` exists.
2. **`Worker is not defined` in tests**:
   - Expected behavior when running tests in headless Node.js environments without browser Web Workers. The application automatically falls back to the internal chess evaluator during testing.
3. **`Port 5000 or 5173 already in use`**:
   - Change `PORT=5001` in `backend/.env` and `VITE_API_URL=http://localhost:5001/api` in `frontend/.env`.
