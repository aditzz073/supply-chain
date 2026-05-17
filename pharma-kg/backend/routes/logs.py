import logging
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from models.schemas import SearchLogModel, SearchLogSummary, SearchLogDetail

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/logs", response_model=list[SearchLogSummary])
async def list_recent_logs(session: AsyncSession = Depends(get_session)):
    """Return the last 50 searches (summary view)."""
    stmt = (
        select(SearchLogModel)
        .order_by(SearchLogModel.searched_at.desc())
        .limit(50)
    )
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [
        SearchLogSummary(
            id=str(r.id),
            medicine_name=r.medicine_name,
            searched_at=r.searched_at,
            node_count=r.node_count,
            geographic_risk=r.geographic_risk,
        )
        for r in rows
    ]


@router.get("/logs/{medicine_name}", response_model=list[SearchLogDetail])
async def get_medicine_logs(
    medicine_name: str,
    session: AsyncSession = Depends(get_session),
):
    """Return all historical searches for a specific medicine, ordered by time."""
    stmt = (
        select(SearchLogModel)
        .where(SearchLogModel.medicine_name == medicine_name.lower())
        .order_by(SearchLogModel.searched_at.desc())
    )
    result = await session.execute(stmt)
    rows = result.scalars().all()
    return [
        SearchLogDetail(
            id=str(r.id),
            medicine_name=r.medicine_name,
            searched_at=r.searched_at,
            node_count=r.node_count,
            edge_count=r.edge_count,
            countries_covered=r.countries_covered,
            geographic_risk=r.geographic_risk,
            raw_response_json=r.raw_response_json,
            user_session=r.user_session,
        )
        for r in rows
    ]
