from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime
import uuid

from sqlalchemy import Column, Integer, String, JSON, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# SQLAlchemy ORM models (existing)
# ---------------------------------------------------------------------------

class SavedGraphModel(Base):
    __tablename__ = "saved_graphs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    medicine_name = Column(String, nullable=False)
    graph_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class SavedSupplierModel(Base):
    __tablename__ = "saved_suppliers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, nullable=False, index=True)
    medicine_name = Column(String, nullable=False)
    supplier_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# Search log ORM model (new)
# ---------------------------------------------------------------------------

class SearchLogModel(Base):
    __tablename__ = "search_logs"

    id = Column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medicine_name = Column(String, nullable=False, index=True)
    searched_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    node_count = Column(Integer, nullable=False, default=0)
    edge_count = Column(Integer, nullable=False, default=0)
    countries_covered = Column(Integer, nullable=False, default=0)
    geographic_risk = Column(String, nullable=False, default="unknown")
    raw_response_json = Column(JSON, nullable=False)
    user_session = Column(String, nullable=False, default="anonymous")


# ---------------------------------------------------------------------------
# Pydantic schemas — request / response
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    medicine_name: str


# -- Distribution network node & edge types --

NodeType = Literal["raw_material", "manufacturer", "primary_dist", "regional_dist", "endpoint"]
TransportMode = Literal["sea", "air", "road", "rail"]
RiskLevel = Literal["low", "medium", "high"]


class NetworkNode(BaseModel):
    id: str
    type: NodeType
    name: str
    country: str = ""
    city: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    certifications: list[str] = []
    annual_volume: Optional[str] = ""
    market_share_pct: Optional[float] = 0
    risk_factors: list[str] = []
    notes: Optional[str] = ""


class NetworkEdge(BaseModel):
    id: str
    source: str
    target: str
    transport_mode: TransportMode = "road"
    avg_lead_days: Optional[float] = 0
    regulatory_checkpoint: bool = False
    annual_volume_kg: Optional[str] = ""
    risk_level: RiskLevel = "low"
    notes: Optional[str] = ""


class MedicineInfo(BaseModel):
    name: str
    generic_name: str = ""
    salt: str = ""
    drug_class: str = ""
    who_essential: bool = False


class NetworkSummary(BaseModel):
    total_countries: int = 0
    critical_chokepoints: list[str] = []
    avg_farm_to_pharmacy_days: Optional[float] = 0
    geographic_risk: RiskLevel = "low"
    supply_concentration_risk: RiskLevel = "low"


class DistributionNetworkResponse(BaseModel):
    medicine: MedicineInfo
    network_nodes: list[NetworkNode] = []
    network_edges: list[NetworkEdge] = []
    network_summary: NetworkSummary = NetworkSummary()
    network_changes: list[str] = []


# -- Save / graph persistence (kept for backward compat) --

class SaveGraphRequest(BaseModel):
    medicine_name: str
    graph_data: dict


class SaveSupplierRequest(BaseModel):
    medicine_name: str
    supplier_data: dict


class SavedGraphResponse(BaseModel):
    id: int
    medicine_name: str
    graph_data: dict
    created_at: datetime

    class Config:
        from_attributes = True


# -- Log response schemas --

class SearchLogSummary(BaseModel):
    id: str
    medicine_name: str
    searched_at: datetime
    node_count: int
    geographic_risk: str

    class Config:
        from_attributes = True


class SearchLogDetail(BaseModel):
    id: str
    medicine_name: str
    searched_at: datetime
    node_count: int
    edge_count: int
    countries_covered: int
    geographic_risk: str
    raw_response_json: dict
    user_session: str

    class Config:
        from_attributes = True
