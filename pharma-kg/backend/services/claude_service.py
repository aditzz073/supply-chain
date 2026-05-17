import os
import json
import logging
import httpx

logger = logging.getLogger(__name__)

OPENAI_MODEL = "gpt-4o"
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"


def _get_api_key() -> str:
    key = os.getenv("OPENAI_API_KEY", "")
    if not key:
        logger.error("OPENAI_API_KEY is not set!")
    return key


SYSTEM_PROMPT = (
    "You are a pharmaceutical supply chain and global distribution network expert "
    "with deep knowledge of international logistics routes. "
    "Return ONLY valid JSON. No markdown, no explanation."
)


def _build_history_block(prior_searches: list[dict]) -> str:
    """Build a text block summarising previous network maps for the same medicine."""
    if not prior_searches:
        return ""
    lines = [
        "\n--- PREVIOUS NETWORK MAPS FOR THIS MEDICINE ---",
        "Previous network maps for this medicine showed these patterns:",
    ]
    for ps in prior_searches:
        lines.append(
            f"  - {ps['searched_at']}: {ps['node_count']} nodes, "
            f"{ps['edge_count']} edges, {ps['countries_covered']} countries, "
            f"geographic risk: {ps['geographic_risk']}"
        )
    lines.append(
        'Note any changes or new routes that have appeared. '
        'Include a "network_changes" array of short strings describing deltas.'
    )
    return "\n".join(lines)


def build_user_prompt(
    medicine_name: str,
    real_data_context: str,
    prior_searches: list[dict] | None = None,
) -> str:
    history_block = _build_history_block(prior_searches or [])

    return f'''{real_data_context}
{history_block}

For the medicine/salt "{medicine_name}", map its COMPLETE global distribution network from raw API origin to end-point delivery.

STRICT REQUIREMENTS — you MUST follow these:
- Return a MINIMUM of 25 network_nodes total
- Include at least 3 raw_material origin nodes (different countries)
- Include at least 6 manufacturer nodes across different continents
- Include at least 5 primary_dist nodes (continental distributors)
- Include at least 7 regional_dist nodes (country/state level)
- Include at least 4 endpoint nodes (hospital networks, pharmacy chains)
- Every node MUST have accurate lat and lng coordinates
- Spread nodes across multiple continents — do NOT cluster in one region
- Every node must be a real, named company or institution
- network_edges must connect ALL nodes in a logical flow
- Include at minimum 30 edges
- You MUST return at least 25 nodes — fewer is NOT acceptable

For each node, risk_factors must be one or more of:
"geopolitical" | "single_source" | "capacity_constraint" | "regulatory" | "weather" | "port_congestion" | "currency"

Return this exact JSON schema:
{{
  "medicine": {{
    "name": "...",
    "generic_name": "...",
    "salt": "...",
    "drug_class": "...",
    "who_essential": true
  }},
  "network_nodes": [
    {{
      "id": "node_001",
      "type": "raw_material|manufacturer|primary_dist|regional_dist|endpoint",
      "name": "...",
      "country": "...",
      "city": "...",
      "lat": 0.000,
      "lng": 0.000,
      "certifications": ["GMP", "WHO-GMP", "FDA", "EMA"],
      "annual_volume": "...",
      "market_share_pct": 0,
      "risk_factors": ["..."],
      "notes": "..."
    }}
  ],
  "network_edges": [
    {{
      "id": "edge_001",
      "source": "node_001",
      "target": "node_002",
      "transport_mode": "sea|air|road|rail",
      "avg_lead_days": 0,
      "regulatory_checkpoint": true,
      "annual_volume_kg": "...",
      "risk_level": "low|medium|high",
      "notes": "..."
    }}
  ],
  "network_summary": {{
    "total_countries": 0,
    "critical_chokepoints": ["..."],
    "avg_farm_to_pharmacy_days": 0,
    "geographic_risk": "low|medium|high",
    "supply_concentration_risk": "low|medium|high"
  }},
  "network_changes": []
}}

Only return JSON. No preamble. No explanation. No markdown fences.'''


def _clean_json_text(text: str) -> str:
    """Strip markdown fences if present."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]  # remove opening ```json or ```
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text


async def query_llm(
    medicine_name: str,
    real_data_context: str,
    prior_searches: list[dict] | None = None,
) -> dict:
    api_key = _get_api_key()
    logger.info(
        f"Using API key: {api_key[:15]}..."
        if len(api_key) > 15
        else "API key is empty or too short!"
    )
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENAI_MODEL,
        "response_format": {"type": "json_object"},
        "max_tokens": 8000,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": build_user_prompt(medicine_name, real_data_context, prior_searches),
            },
        ],
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(OPENAI_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            logger.error(f"OpenAI API returned {response.status_code}: {response.text}")
        response.raise_for_status()
        data = response.json()

    text_content = data["choices"][0]["message"]["content"]
    logger.info(f"OpenAI raw text (first 200 chars): {text_content[:200]}")
    text_content = _clean_json_text(text_content)
    return json.loads(text_content)


async def query_claude_with_retry(
    medicine_name: str,
    real_data_context: str,
    prior_searches: list[dict] | None = None,
) -> dict:
    """Call OpenAI API with retry on JSON parse failure or too few nodes."""
    try:
        result = await query_llm(medicine_name, real_data_context, prior_searches)
    except (json.JSONDecodeError, KeyError):
        result = await query_llm(medicine_name, real_data_context, prior_searches)

    # Retry once if response has fewer than 20 nodes
    nodes = result.get("network_nodes", [])
    if len(nodes) < 20:
        logger.warning(
            f"Only {len(nodes)} nodes returned — retrying for richer network"
        )
        try:
            result = await query_llm(medicine_name, real_data_context, prior_searches)
        except Exception:
            pass  # keep the first result if retry fails

    return result
