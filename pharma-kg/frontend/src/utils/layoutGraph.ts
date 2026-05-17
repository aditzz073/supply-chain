import { SupplyChainData, NodeType, TransportMode, RiskLevel } from '../types/graph';
import { ElementDefinition } from 'cytoscape';

// ---------------------------------------------------------------------------
// Node style config by type
// ---------------------------------------------------------------------------

export interface NodeStyle {
  color: string;
  border: string;
  hover: string;
  shape: string;
  label: string;
}

export const nodeStyles: Record<NodeType, NodeStyle> = {
  raw_material:  { color: '#78350F', border: '#451A03', hover: '#A16207', shape: 'rhomboid',          label: 'Raw Material' },
  manufacturer:  { color: '#1E40AF', border: '#1E3A8A', hover: '#3B82F6', shape: 'rectangle',         label: 'Manufacturer' },
  primary_dist:  { color: '#065F46', border: '#064E3B', hover: '#10B981', shape: 'ellipse',            label: 'Primary Dist.' },
  regional_dist: { color: '#92400E', border: '#78350F', hover: '#F59E0B', shape: 'ellipse',            label: 'Regional Dist.' },
  endpoint:      { color: '#6D28D9', border: '#5B21B6', hover: '#A78BFA', shape: 'round-rectangle',    label: 'Endpoint' },
};

// ---------------------------------------------------------------------------
// Edge style config by transport_mode
// ---------------------------------------------------------------------------

export interface EdgeStyle {
  color: string;
  lineStyle: string;
  dashPattern: number[];
  label: string;
}

export const edgeStyles: Record<TransportMode, EdgeStyle> = {
  sea:  { color: '#2563EB', lineStyle: 'dashed', dashPattern: [8, 4], label: 'sea' },
  air:  { color: '#EA580C', lineStyle: 'solid',  dashPattern: [],     label: 'air' },
  road: { color: '#6B7280', lineStyle: 'solid',  dashPattern: [],     label: 'road' },
  rail: { color: '#1E293B', lineStyle: 'dotted', dashPattern: [3, 3], label: 'rail' },
};

const riskEdgeColors: Record<RiskLevel, string> = {
  low: '',           // use transport default
  medium: '#D97706', // amber tint
  high: '#DC2626',   // red tint
};

// ---------------------------------------------------------------------------
// Sizing helpers
// ---------------------------------------------------------------------------

function getNodeSize(type: NodeType): number {
  if (type === 'raw_material') return 65;
  if (type === 'manufacturer') return 70;
  if (type === 'primary_dist') return 60;
  if (type === 'regional_dist') return 50;
  return 48; // endpoint
}

function getEdgeWidth(volumeStr: string): number {
  const vol = parseFloat(volumeStr) || 0;
  if (vol <= 0) return 1.5;
  if (vol < 1000) return 1.5;
  if (vol < 10000) return 2.5;
  if (vol < 100000) return 3.5;
  return 4.5;
}

// ---------------------------------------------------------------------------
// Build Cytoscape elements from SupplyChainData
// ---------------------------------------------------------------------------

export function buildElements(data: SupplyChainData): ElementDefinition[] {
  const elements: ElementDefinition[] = [];
  const nodes = data.network_nodes || [];
  const edges = data.network_edges || [];

  // -- Nodes --
  for (const node of nodes) {
    const style = nodeStyles[node.type] || nodeStyles.endpoint;
    const size = getNodeSize(node.type);

    elements.push({
      data: {
        id: node.id,
        label: node.name,
        color: style.color,
        hoverColor: style.hover,
        borderColor: style.border,
        nodeShape: style.shape,
        size,
        textWidth: size - 12,
        nodeType: node.type,
        isLeaf: true,
        // Flat fields for panel / tooltip
        supplierName: node.name,
        country: node.country || '',
        city: node.city || '',
        certifications: (node.certifications || []).join(','),
        annualVolume: node.annual_volume || '',
        marketShare: node.market_share_pct || 0,
        riskFactors: (node.risk_factors || []).join(','),
        notes: node.notes || '',
        lat: node.lat,
        lng: node.lng,
      },
    });
  }

  // -- Edges --
  for (const edge of edges) {
    const transport = edgeStyles[edge.transport_mode] || edgeStyles.road;
    const riskColor = riskEdgeColors[edge.risk_level];
    const lineColor = riskColor || transport.color;
    const width = getEdgeWidth(edge.annual_volume_kg || '');
    const leadLabel = edge.avg_lead_days ? `~ ${edge.avg_lead_days}d ${transport.label}` : transport.label;

    elements.push({
      data: {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: leadLabel,
        lineColor,
        lineStyle: transport.lineStyle,
        dashPattern: transport.dashPattern,
        width,
        transportMode: edge.transport_mode,
        riskLevel: edge.risk_level,
        regulatoryCheckpoint: edge.regulatory_checkpoint,
      },
    });
  }

  console.log('[buildElements] total:', elements.length, 'nodes:', nodes.length, 'edges:', edges.length);
  return elements;
}
