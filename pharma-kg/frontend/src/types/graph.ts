// ---------------------------------------------------------------------------
// New distribution network types (matching backend schemas)
// ---------------------------------------------------------------------------

export type NodeType = 'raw_material' | 'manufacturer' | 'primary_dist' | 'regional_dist' | 'endpoint';
export type TransportMode = 'sea' | 'air' | 'road' | 'rail';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface NetworkNode {
  id: string;
  type: NodeType;
  name: string;
  country: string;
  city: string;
  lat: number | null;
  lng: number | null;
  certifications: string[];
  annual_volume: string;
  market_share_pct: number;
  risk_factors: string[];
  notes: string;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  transport_mode: TransportMode;
  avg_lead_days: number;
  regulatory_checkpoint: boolean;
  annual_volume_kg: string;
  risk_level: RiskLevel;
  notes: string;
}

export interface MedicineInfo {
  name: string;
  generic_name: string;
  salt: string;
  drug_class: string;
  who_essential: boolean;
}

export interface NetworkSummary {
  total_countries: number;
  critical_chokepoints: string[];
  avg_farm_to_pharmacy_days: number;
  geographic_risk: RiskLevel;
  supply_concentration_risk: RiskLevel;
}

export interface SupplyChainData {
  medicine: MedicineInfo;
  network_nodes: NetworkNode[];
  network_edges: NetworkEdge[];
  network_summary: NetworkSummary;
  network_changes: string[];
}

// ---------------------------------------------------------------------------
// Legacy aliases kept for backward compat in components
// ---------------------------------------------------------------------------

export type ApiSupplier = NetworkNode;
export type RegulatoryBody = NetworkNode;
export type KeyBrand = NetworkNode;

export interface SelectedNodeData {
  type: string;
  data: NetworkNode;
  medicineName: string;
}
