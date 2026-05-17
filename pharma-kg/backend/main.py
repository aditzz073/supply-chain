import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO)
load_dotenv(override=True)

from routes.search import router as search_router
from routes.graphs import router as graphs_router
from routes.shortage import router as shortage_router
from routes.logs import router as logs_router
from routes.report import router as report_router
from db import init_db

app = FastAPI(title="Pharma Supply Chain Knowledge Graph API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router, tags=["Search"])
app.include_router(graphs_router, tags=["Graphs"])
app.include_router(shortage_router, tags=["Shortage"])
app.include_router(logs_router, tags=["Logs"])
app.include_router(report_router, tags=["Report"])


@app.on_event("startup")
async def startup():
    try:
        await init_db()
    except Exception as e:
        print(f"Warning: Could not initialize database: {e}")


@app.get("/health")
async def health():
    return {"status": "ok"}
