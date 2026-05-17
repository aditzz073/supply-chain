import httpx
from fastapi import APIRouter

router = APIRouter()


@router.get("/shortage")
async def check_shortage(medicine: str):
    url = f"https://api.fda.gov/drug/shortage.json?search=generic_name:{medicine}&limit=5"
    async with httpx.AsyncClient() as client:
        try:
            r = await client.get(url, timeout=8)
            data = r.json()
            results = data.get("results", [])
            if results:
                return {
                    "shortage": True,
                    "count": len(results),
                    "details": [
                        {
                            "name": item.get("generic_name", ""),
                            "status": item.get("status", ""),
                            "reason": item.get("reason_for_shortage", "Unknown reason"),
                        }
                        for item in results
                    ],
                }
            return {"shortage": False}
        except Exception:
            return {"shortage": False}
