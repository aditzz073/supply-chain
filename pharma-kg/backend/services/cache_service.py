import os
import json
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
CACHE_TTL = 86400  # 24 hours

_redis_client: redis.Redis | None = None


async def get_redis() -> redis.Redis | None:
    global _redis_client
    if _redis_client is not None:
        try:
            await _redis_client.ping()
            return _redis_client
        except Exception:
            _redis_client = None
    try:
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        await _redis_client.ping()
    except Exception:
        _redis_client = None
    return _redis_client


async def get_cached(key: str) -> dict | None:
    client = await get_redis()
    if client is None:
        return None
    try:
        data = await client.get(f"pharmakg:{key}")
        if data:
            return json.loads(data)
    except Exception:
        pass
    return None


async def set_cached(key: str, value: dict) -> None:
    client = await get_redis()
    if client is None:
        return
    try:
        await client.set(f"pharmakg:{key}", json.dumps(value), ex=CACHE_TTL)
    except Exception:
        pass
