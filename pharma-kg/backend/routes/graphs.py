import os
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db import get_session
from models.schemas import (
    SaveGraphRequest,
    SavedGraphModel,
    SavedGraphResponse,
    SavedSupplierModel,
    SaveSupplierRequest,
)

router = APIRouter()

CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")


async def get_user_id(authorization: Optional[str] = Header(None)) -> str:
    """Extract user ID from Clerk JWT. Returns 'anonymous' if auth is not configured."""
    if not CLERK_SECRET_KEY or not authorization:
        return "anonymous"
    try:
        token = authorization.replace("Bearer ", "")
        decoded = jwt.decode(token, options={"verify_signature": False})
        return decoded.get("sub", "anonymous")
    except Exception:
        return "anonymous"


@router.get("/graphs", response_model=list[SavedGraphResponse])
async def list_graphs(
    user_id: str = Depends(get_user_id),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(SavedGraphModel)
        .where(SavedGraphModel.user_id == user_id)
        .order_by(SavedGraphModel.created_at.desc())
    )
    graphs = result.scalars().all()
    return graphs


@router.post("/graphs", response_model=SavedGraphResponse)
async def save_graph(
    request: SaveGraphRequest,
    user_id: str = Depends(get_user_id),
    session: AsyncSession = Depends(get_session),
):
    graph = SavedGraphModel(
        user_id=user_id,
        medicine_name=request.medicine_name,
        graph_data=request.graph_data,
    )
    session.add(graph)
    await session.commit()
    await session.refresh(graph)
    return graph


@router.post("/graphs/suppliers")
async def save_supplier(
    request: SaveSupplierRequest,
    user_id: str = Depends(get_user_id),
    session: AsyncSession = Depends(get_session),
):
    supplier = SavedSupplierModel(
        user_id=user_id,
        medicine_name=request.medicine_name,
        supplier_data=request.supplier_data,
    )
    session.add(supplier)
    await session.commit()
    await session.refresh(supplier)
    return {"id": supplier.id, "message": "Supplier saved"}
