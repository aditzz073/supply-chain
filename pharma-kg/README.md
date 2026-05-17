# Pharma Supply Chain Knowledge Graph

An interactive web application that generates and visualizes pharmaceutical supply chain knowledge graphs using AI.

## Features

- Search for any medicine/drug by name
- AI-powered supply chain data generation via Claude API with web search grounding
- Interactive knowledge graph visualization with React Flow
- Detailed supplier information panels with contact actions
- Redis caching for repeated queries (24h TTL)
- PostgreSQL persistence for saved graphs and suppliers
- Clerk authentication (optional)
- Search history (last 5, stored in localStorage)
- Draggable nodes with reset layout

## Tech Stack

- **Frontend:** React 18, Vite, TypeScript, React Flow, TailwindCSS, Clerk
- **Backend:** FastAPI, Python 3.11+, Redis, PostgreSQL, httpx
- **AI:** Anthropic Claude API (claude-sonnet-4-20250514) with web search tool

## Project Structure

```
pharma-kg/
├── backend/
│   ├── main.py                  # FastAPI entry point
│   ├── db.py                    # Database setup
│   ├── routes/
│   │   ├── search.py            # POST /search endpoint
│   │   └── graphs.py            # GET/POST /graphs (saved graphs)
│   ├── services/
│   │   ├── claude_service.py    # Claude API call + prompt builder
│   │   └── cache_service.py     # Redis get/set
│   ├── models/
│   │   └── schemas.py           # Pydantic + SQLAlchemy models
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── SearchBar.tsx
│   │   │   ├── KnowledgeGraph.tsx
│   │   │   ├── SupplierPanel.tsx
│   │   │   └── NodeTypes/
│   │   │       ├── MedicineNode.tsx
│   │   │       └── SupplierNode.tsx
│   │   ├── hooks/
│   │   │   └── useGraphData.ts
│   │   ├── types/
│   │   │   └── graph.ts
│   │   └── utils/
│   │       └── layoutGraph.ts
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── vercel.json
│   └── package.json
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Redis (optional — app gracefully degrades without it)
- PostgreSQL (optional — needed for save features)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY and other credentials
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`. Visit `/docs` for the interactive Swagger UI.

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env if needed
npm run dev
```

The app will be available at `http://localhost:5173`.

## Environment Variables

### Backend (`backend/.env`)

| Variable            | Description                              | Required |
| ------------------- | ---------------------------------------- | -------- |
| `ANTHROPIC_API_KEY` | Your Anthropic API key                   | Yes      |
| `REDIS_URL`         | Redis connection URL                     | No       |
| `DATABASE_URL`      | PostgreSQL async connection URL          | No       |
| `CLERK_SECRET_KEY`  | Clerk secret key for JWT verification    | No       |

### Frontend (`frontend/.env`)

| Variable                       | Description                              | Required |
| ------------------------------ | ---------------------------------------- | -------- |
| `VITE_API_BASE_URL`            | Backend API URL (default: http://localhost:8000) | No  |
| `VITE_CLERK_PUBLISHABLE_KEY`   | Clerk publishable key                    | No       |

## API Endpoints

| Method | Endpoint             | Description                    |
| ------ | -------------------- | ------------------------------ |
| POST   | `/search`            | Search medicine supply chain   |
| GET    | `/graphs`            | List saved graphs              |
| POST   | `/graphs`            | Save a graph                   |
| POST   | `/graphs/suppliers`  | Save a supplier to list        |
| GET    | `/health`            | Health check                   |

## Docker (Backend)

```bash
cd backend
docker build -t pharma-kg-backend .
docker run -p 8000:8000 --env-file .env pharma-kg-backend
```

## Deployment

- **Frontend:** Deploy to Vercel using the included `vercel.json`
- **Backend:** Deploy using the included `Dockerfile` to any container platform

## Architecture

```
User → SearchBar → POST /search → Redis Cache Check
                                       ↓ (miss)
                                  Claude API (web search enabled)
                                       ↓
                                  Parse JSON → Cache in Redis (24h)
                                       ↓
                          React Flow Graph ← dagre auto-layout
                                       ↓
                          SupplierPanel (click leaf node for details)
```
