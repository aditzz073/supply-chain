import os
import json
import logging
import httpx
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from models.schemas import SearchLogModel
from services.cache_service import get_cached

logger = logging.getLogger(__name__)

router = APIRouter()

OPENAI_MODEL = "gpt-4o"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

REPORT_SYSTEM_PROMPT = (
    "You are a pharmaceutical supply chain analyst writing an executive report "
    "for a hospital procurement team. Be precise, factual, and actionable. "
    "Use the data provided. Return ONLY valid JSON, no markdown."
)

REPORT_USER_PROMPT = """Generate a supply chain intelligence report for {medicine}.

Network data:
{network_json}

Historical searches:
{log_history}

The report must include these sections:
1. Executive Summary (3 sentences max)
2. Network Overview (countries, node count, transport modes)
3. Critical Chokepoints (which nodes/edges are single points of failure)
4. Risk Assessment (geographic concentration, regulatory risks, lead time risks)
5. Historical Changes (what has changed since previous searches — use log data)
6. Recommendations (3-5 specific actions for procurement team)
7. Alternative Sourcing Options (if primary routes fail, what are backup options)

Return as structured JSON:
{{
  "title": "Supply Chain Intelligence Report: {medicine}",
  "generated_at": "{generated_at}",
  "sections": [
    {{ "heading": "Executive Summary", "content": "..." }},
    {{ "heading": "Network Overview", "content": "..." }},
    {{ "heading": "Critical Chokepoints", "content": "..." }},
    {{ "heading": "Risk Assessment", "content": "..." }},
    {{ "heading": "Historical Changes", "content": "..." }},
    {{ "heading": "Recommendations", "content": "..." }},
    {{ "heading": "Alternative Sourcing Options", "content": "..." }}
  ],
  "risk_score": 0,
  "key_metrics": {{
    "total_nodes": 0,
    "countries": 0,
    "avg_lead_days": 0,
    "chokepoints": 0
  }}
}}

RULES:
- risk_score is 0-100 (0 = no risk, 100 = critical risk)
- Each section content should be 2-5 sentences of dense, actionable text.
- Only return JSON. No preamble."""


def _clean_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


async def _generate_report(medicine_name: str, network_json: dict, log_history: list[dict]) -> dict:
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    now = datetime.utcnow().isoformat(timespec="seconds") + "Z"
    user_prompt = REPORT_USER_PROMPT.format(
        medicine=medicine_name,
        network_json=json.dumps(network_json, indent=2)[:6000],
        log_history=json.dumps(log_history, indent=2)[:2000],
        generated_at=now,
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENAI_MODEL,
        "response_format": {"type": "json_object"},
        "max_tokens": 4096,
        "messages": [
            {"role": "system", "content": REPORT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(OPENAI_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            logger.error(f"OpenAI API returned {response.status_code}: {response.text}")
        response.raise_for_status()
        data = response.json()

    text = data["choices"][0]["message"]["content"]
    text = _clean_json_text(text)
    return json.loads(text)


@router.post("/report/{medicine_name}")
async def generate_report(
    medicine_name: str,
    session: AsyncSession = Depends(get_session),
):
    cache_key = medicine_name.lower()

    # 1. Pull current network JSON from Redis cache
    network_json = await get_cached(cache_key)
    if not network_json:
        raise HTTPException(
            status_code=404,
            detail=f"No network data found for '{medicine_name}'. Search first.",
        )

    # 2. Pull historical log entries
    try:
        stmt = (
            select(SearchLogModel)
            .where(SearchLogModel.medicine_name == medicine_name.lower())
            .order_by(SearchLogModel.searched_at.desc())
            .limit(10)
        )
        result = await session.execute(stmt)
        rows = result.scalars().all()
        log_history = [
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
        logger.warning(f"Could not fetch log history: {e}")
        log_history = []

    # 3. Generate report via Claude/OpenAI
    try:
        report = await _generate_report(medicine_name, network_json, log_history)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse report as JSON")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=502, detail=f"LLM API error: {e.response.status_code}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")

    return report
