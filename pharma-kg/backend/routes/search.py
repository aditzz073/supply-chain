import json
import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from models.schemas import (
    SearchRequest,
    DistributionNetworkResponse,
    SearchLogModel,
)
from services.cache_service import get_cached, set_cached
from services.claude_service import query_claude_with_retry
from services.data_sources import gather_real_data, format_real_data_for_prompt

logger = logging.getLogger(__name__)

router = APIRouter()


async def _get_prior_searches(medicine_name: str, session: AsyncSession) -> list[dict]:
    """Fetch the last 5 searches for the same medicine from PostgreSQL."""
    try:
        stmt = (
            select(SearchLogModel)
            .where(SearchLogModel.medicine_name == medicine_name.lower())
            .order_by(SearchLogModel.searched_at.desc())
            .limit(5)
        )
        result = await session.execute(stmt)
        rows = result.scalars().all()
        return [
            {
                "searched_at": str(r.searched_at),
                "node_count": r.node_count,
                "edge_count": r.edge_count,
                "countries_covered": r.countries_covered,
                "geographic_risk": r.geographic_risk,
            }
            for r in rows
        ]
    except Exception as e:
        logger.warning(f"Could not fetch prior searches: {e}")
        return []


async def _save_search_log(
    medicine_name: str, result: dict, session: AsyncSession
) -> None:
    """Persist a search log entry to PostgreSQL."""
    try:
        nodes = result.get("network_nodes", [])
        edges = result.get("network_edges", [])
        summary = result.get("network_summary", {})
        countries = len(set(n.get("country", "") for n in nodes if n.get("country")))

        log = SearchLogModel(
            medicine_name=medicine_name.lower(),
            node_count=len(nodes),
            edge_count=len(edges),
            countries_covered=summary.get("total_countries", countries),
            geographic_risk=summary.get("geographic_risk", "unknown"),
            raw_response_json=result,
            user_session="anonymous",
        )
        session.add(log)
        await session.commit()
        logger.info(f"Search log saved for '{medicine_name}'")
    except Exception as e:
        logger.warning(f"Could not save search log: {e}")


@router.post("/search", response_model=DistributionNetworkResponse)
async def search_medicine(
    request: SearchRequest,
    session: AsyncSession = Depends(get_session),
):
    medicine_name = request.medicine_name.strip()
    if not medicine_name:
        raise HTTPException(status_code=400, detail="Medicine name is required")

    cache_key = medicine_name.lower()

    # Check cache first
    cached = await get_cached(cache_key)
    if cached:
        return DistributionNetworkResponse(**cached)

    # Phase 0: Fetch prior searches for pattern detection
    prior_searches = await _get_prior_searches(medicine_name, session)
    if prior_searches:
        logger.info(f"Found {len(prior_searches)} prior searches for '{medicine_name}'")

    # Phase 1: Query real databases (OpenFDA, RxNorm) in parallel
    logger.info(f"Fetching real data for '{medicine_name}'...")
    real_data = await gather_real_data(medicine_name)
    real_data_context = format_real_data_for_prompt(medicine_name, real_data)
    logger.info(f"Real data context length: {len(real_data_context)} chars")

    # Phase 2: Send real data + schema + history to LLM
    try:
        result = await query_claude_with_retry(
            medicine_name, real_data_context, prior_searches or None
        )
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse LLM response as valid JSON after retry",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM API error: {str(e)}")

    # Phase 3: Cache the result (24h TTL)
    await set_cached(cache_key, result)

    # Phase 4: Save search log to PostgreSQL
    await _save_search_log(medicine_name, result, session)

    return DistributionNetworkResponse(**result)
