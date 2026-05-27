import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
// @ts-ignore — no type defs for leaflet-ant-path
import { antPath } from 'leaflet-ant-path';
import type { SupplyChainData, NetworkNode, NetworkEdge, TransportMode, NodeType } from '../types/graph';
import { nodeStyles } from '../utils/layoutGraph';

interface NetworkMapProps {
  data: SupplyChainData;
  onNodeSelect: (nodeData: any, isShiftHeld: boolean) => void;
  highlightNodeIds?: string[];
  highlightEdgeIds?: string[];
}

export function nodeToSelectPayload(node: NetworkNode) {
  return {
    supplierName: node.name,
    company_name: node.name,
    name: node.name,
    country: node.country,
    city: node.city || '',
    certifications: node.certifications || [],
    annualVolume: node.annual_volume || '',
    marketShare: node.market_share_pct || 0,
    riskFactors: node.risk_factors || [],
    notes: node.notes || '',
    nodeType: node.type,
    lat: node.lat,
    lng: node.lng,
  };
}

function getMarkerRadius(share: number): number {
  if (!share || share <= 0) return 6;
  if (share < 5) return 7;
  if (share < 15) return 10;
  if (share < 30) return 14;
  return 18;
}

const routeColors: Record<TransportMode, string> = {
  sea: '#0284C7',
  air: '#D97706',
  road: '#64748B',
  rail: '#7C3AED',
};

const nodeLegend: { type: NodeType; label: string; color: string }[] = [
  { type: 'raw_material',  label: 'Raw Material',          color: '#78350F' },
  { type: 'manufacturer',  label: 'Manufacturer',          color: '#1E40AF' },
  { type: 'primary_dist',  label: 'Primary Distributor',   color: '#065F46' },
  { type: 'regional_dist', label: 'Regional Distributor',  color: '#92400E' },
  { type: 'endpoint',      label: 'Delivery Endpoint',     color: '#6D28D9' },
];

const edgeLegend: { mode: TransportMode; label: string; color: string; dashed: boolean }[] = [
  { mode: 'sea',  label: 'Sea route',  color: '#0284C7', dashed: true },
  { mode: 'air',  label: 'Air route',  color: '#D97706', dashed: false },
  { mode: 'road', label: 'Road route', color: '#64748B', dashed: false },
  { mode: 'rail', label: 'Rail route', color: '#7C3AED', dashed: true },
];

// Auto-fit bounds to all nodes with coords
function FitBounds({ nodes }: { nodes: NetworkNode[] }) {
  const map = useMap();
  const coords = nodes
    .filter((n) => n.lat != null && n.lng != null)
    .map((n) => [n.lat!, n.lng!] as [number, number]);

  if (coords.length > 1) {
    setTimeout(() => {
      try { map.fitBounds(coords, { padding: [40, 40], maxZoom: 6 }); } catch { /* noop */ }
    }, 100);
  }
  return null;
}

// Imperative layer: adds animated ant-paths for each edge
function AnimatedEdges({ edges, nodeMap, highlightEdgeIds }: { edges: NetworkEdge[]; nodeMap: Map<string, NetworkNode>; highlightEdgeIds?: string[] }) {
  const map = useMap();
  const layerGroupRef = useRef<L.LayerGroup>(L.layerGroup());

  useEffect(() => {
    const lg = layerGroupRef.current;
    lg.clearLayers();
    lg.addTo(map);

    const hlSet = new Set(highlightEdgeIds || []);

    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src?.lat || !src?.lng || !tgt?.lat || !tgt?.lng) continue;

      const isHL = hlSet.size > 0 && hlSet.has(edge.id);
      const color = isHL ? '#059669' : (routeColors[edge.transport_mode] || '#64748B');
      const weight = isHL ? 4 : (edge.risk_level === 'high' ? 4 : edge.risk_level === 'medium' ? 2.5 : 1.5);
      const opacity = hlSet.size > 0 && !isHL ? 0.25 : 1;

      const path = antPath(
        [[src.lat, src.lng], [tgt.lat, tgt.lng]],
        {
          delay: 800,
          dashArray: [15, 30],
          weight,
          color,
          pulseColor: '#ffffff',
          paused: false,
          reverse: false,
          hardwareAccelerated: true,
          opacity,
        },
      );
      path.bindTooltip(
        edge.avg_lead_days ? `~ ${edge.avg_lead_days}d ${edge.transport_mode}` : edge.transport_mode,
        { sticky: true },
      );
      lg.addLayer(path);
    }

    return () => {
      lg.clearLayers();
      lg.remove();
    };
  }, [edges, nodeMap, map, highlightEdgeIds]);

  return null;
}

export default function NetworkMap({ data, onNodeSelect, highlightNodeIds, highlightEdgeIds }: NetworkMapProps) {
  const nodes = data.network_nodes || [];
  const edges = data.network_edges || [];

  const nodeMap = useMemo(() => {
    const m = new Map<string, NetworkNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const defaultCenter: [number, number] = [20, 30];

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={defaultCenter}
        zoom={2}
        scrollWheelZoom
        style={{ width: '100%', height: '100%' }}
        zoomControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds nodes={nodes} />
        <AnimatedEdges edges={edges} nodeMap={nodeMap} highlightEdgeIds={highlightEdgeIds} />

        {/* Node markers */}
        {nodes
          .filter((n) => n.lat != null && n.lng != null)
          .map((node) => {
            const style = nodeStyles[node.type] || nodeStyles.endpoint;
            const radius = getMarkerRadius(node.market_share_pct);
            const hlSet = new Set(highlightNodeIds || []);
            const isHL = hlSet.size > 0 && hlSet.has(node.id);
            const dimmed = hlSet.size > 0 && !isHL;

            return (
              <CircleMarker
                key={node.id}
                center={[node.lat!, node.lng!]}
                radius={isHL ? radius + 4 : radius}
                pathOptions={{
                  color: isHL ? '#059669' : style.border,
                  fillColor: style.color,
                  fillOpacity: dimmed ? 0.3 : 0.85,
                  weight: isHL ? 3 : 2,
                }}
                eventHandlers={{
                  click: (e) => {
                    const isShift = (e.originalEvent as MouseEvent)?.shiftKey || false;
                    onNodeSelect(nodeToSelectPayload(node), isShift);
                  },
                }}
              >
                <Tooltip>
                  <strong>{node.name}</strong>
                  <br />
                  {node.city ? `${node.city}, ${node.country}` : node.country}
                  {node.market_share_pct > 0 && <><br />{node.market_share_pct}% market share</>}
                </Tooltip>
              </CircleMarker>
            );
          })}
      </MapContainer>

      {/* Node type legend — top left */}
      <div
        style={{
          position: 'absolute', top: 16, left: 16, zIndex: 1000,
          width: 200, background: '#fff', border: '1px solid #E2E8F0',
          borderRadius: 10, padding: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Network Nodes</div>
        {nodeLegend.map((n) => (
          <div key={n.type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: n.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#334155' }}>{n.label}</span>
          </div>
        ))}
      </div>

      {/* Transport route legend — bottom left */}
      <div
        style={{
          position: 'absolute', bottom: 16, left: 16, zIndex: 1000,
          width: 200, background: '#fff', border: '1px solid #E2E8F0',
          borderRadius: 10, padding: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Transport Routes</div>
        {edgeLegend.map((e) => (
          <div key={e.mode} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 24, height: 3, borderRadius: 2, flexShrink: 0,
              background: e.dashed ? 'transparent' : e.color,
              borderTop: e.dashed ? `3px dashed ${e.color}` : 'none',
            }} />
            <span style={{ fontSize: 13, color: '#334155' }}>{e.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
