import { useState, useMemo } from 'react';
import { MapPin } from 'lucide-react';
import type { SupplyChainData, NetworkNode, NetworkEdge } from '../types/graph';

interface DeliveryZonePanelProps {
  data: SupplyChainData;
  onHighlight: (nodeIds: string[], edgeKeys: string[]) => void;
  onReset: () => void;
}

interface RouteResult {
  distributor: NetworkNode;
  totalLeadDays: number;
  pathEdges: string[]; // edge ids
  pathNodeIds: string[];
}

// Build adjacency for BFS: for each node, which edges lead TO it
function buildInboundMap(edges: NetworkEdge[]): Map<string, { edge: NetworkEdge; fromId: string }[]> {
  const m = new Map<string, { edge: NetworkEdge; fromId: string }[]>();
  for (const e of edges) {
    if (!m.has(e.target)) m.set(e.target, []);
    m.get(e.target)!.push({ edge: e, fromId: e.source });
  }
  return m;
}

// Walk backwards from a node to any manufacturer, summing lead days
function traceBackToManufacturer(
  nodeId: string,
  inbound: Map<string, { edge: NetworkEdge; fromId: string }[]>,
  nodeMap: Map<string, NetworkNode>,
  visited: Set<string> = new Set(),
): { totalDays: number; edgeIds: string[]; nodeIds: string[] } | null {
  if (visited.has(nodeId)) return null;
  visited.add(nodeId);

  const node = nodeMap.get(nodeId);
  if (!node) return null;
  if (node.type === 'manufacturer' || node.type === 'raw_material') {
    return { totalDays: 0, edgeIds: [], nodeIds: [nodeId] };
  }

  const incoming = inbound.get(nodeId) || [];
  let best: { totalDays: number; edgeIds: string[]; nodeIds: string[] } | null = null;

  for (const { edge, fromId } of incoming) {
    const upstream = traceBackToManufacturer(fromId, inbound, nodeMap, new Set(visited));
    if (!upstream) continue;
    const total = upstream.totalDays + (edge.avg_lead_days || 0);
    if (!best || total < best.totalDays) {
      best = {
        totalDays: total,
        edgeIds: [...upstream.edgeIds, edge.id],
        nodeIds: [...upstream.nodeIds, nodeId],
      };
    }
  }
  return best;
}

function leadColor(days: number): string {
  if (days < 14) return '#059669';
  if (days <= 30) return '#D97706';
  return '#DC2626';
}

export default function DeliveryZonePanel({ data, onHighlight, onReset }: DeliveryZonePanelProps) {
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [requiredBy, setRequiredBy] = useState('');
  const [results, setResults] = useState<RouteResult[] | null>(null);
  const [noMatch, setNoMatch] = useState<string | null>(null);

  const nodes = data.network_nodes || [];
  const edges = data.network_edges || [];

  const nodeMap = useMemo(() => {
    const m = new Map<string, NetworkNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const inbound = useMemo(() => buildInboundMap(edges), [edges]);

  // Unique countries from endpoints + regional_dist
  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const n of nodes) {
      if ((n.type === 'endpoint' || n.type === 'regional_dist') && n.country) {
        set.add(n.country);
      }
    }
    return Array.from(set).sort();
  }, [nodes]);

  const handleFindRoutes = () => {
    if (!country) return;

    // Find distributors matching country (endpoint or regional_dist)
    let matched = nodes.filter(
      (n) => (n.type === 'regional_dist' || n.type === 'endpoint') && n.country.toLowerCase() === country.toLowerCase()
    );

    // Fallback: any regional_dist or primary_dist (closest hub)
    if (matched.length === 0) {
      // Try primary_dist in same country
      matched = nodes.filter(
        (n) => n.type === 'primary_dist' && n.country.toLowerCase() === country.toLowerCase()
      );
    }

    if (matched.length === 0) {
      // Find nearest primary_dist as fallback
      const fallback = nodes.find((n) => n.type === 'primary_dist');
      if (fallback) {
        setNoMatch(
          `No direct distributor found for ${country}. Nearest hub: ${fallback.name} in ${fallback.country}. Estimated additional transit: +5-10 days.`
        );
      } else {
        setNoMatch(`No distributor found for ${country}.`);
      }
      setResults(null);
      onReset();
      return;
    }

    setNoMatch(null);

    // Trace route back to manufacturer for each match
    const routeResults: RouteResult[] = [];
    const allNodeIds: string[] = [];
    const allEdgeIds: string[] = [];

    for (const dist of matched.slice(0, 2)) {
      const trace = traceBackToManufacturer(dist.id, inbound, nodeMap);
      if (trace) {
        routeResults.push({
          distributor: dist,
          totalLeadDays: trace.totalDays,
          pathEdges: trace.edgeIds,
          pathNodeIds: trace.nodeIds,
        });
        allNodeIds.push(...trace.nodeIds);
        allEdgeIds.push(...trace.edgeIds);
      } else {
        // Still show the distributor even without traceable route
        routeResults.push({
          distributor: dist,
          totalLeadDays: 0,
          pathEdges: [],
          pathNodeIds: [dist.id],
        });
        allNodeIds.push(dist.id);
      }
    }

    setResults(routeResults);
    onHighlight(allNodeIds, allEdgeIds);
  };

  const handleReset = () => {
    setResults(null);
    setNoMatch(null);
    onReset();
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase',
    letterSpacing: '0.04em', marginBottom: 4, display: 'block',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #E2E8F0', borderRadius: 8,
    padding: '10px 12px', fontSize: 14, color: '#0F172A', outline: 'none',
    background: '#fff', boxSizing: 'border-box',
  };

  return (
    <div
      style={{
        position: 'absolute', right: 16, top: 16, zIndex: 1000,
        width: 300, background: '#fff', border: '1px solid #E2E8F0',
        borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        padding: 20, maxHeight: 'calc(100% - 32px)', overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <MapPin size={16} color="#059669" />
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Your Delivery Location</span>
      </div>
      <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>
        Find which distributors service your region
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Country */}
        <div>
          <label style={labelStyle}>Country</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            style={{ ...inputStyle, appearance: 'auto' }}
          >
            <option value="">Select country...</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__custom">Enter custom country...</option>
          </select>
          {country === '__custom' && (
            <input
              type="text"
              placeholder="Type country name..."
              style={{ ...inputStyle, marginTop: 6 }}
              onChange={(e) => setCountry(e.target.value)}
            />
          )}
        </div>

        {/* City */}
        <div>
          <label style={labelStyle}>City or Region</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Mumbai, Maharashtra"
            style={inputStyle}
          />
        </div>

        {/* Required By */}
        <div>
          <label style={labelStyle}>Required By</label>
          <input
            type="date"
            value={requiredBy}
            onChange={(e) => setRequiredBy(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Find Routes button */}
        <button
          onClick={handleFindRoutes}
          disabled={!country || country === '__custom'}
          style={{
            width: '100%', padding: 11, fontSize: 14, fontWeight: 600,
            background: (!country || country === '__custom') ? '#94A3B8' : '#059669',
            color: '#fff', border: 'none', borderRadius: 8, cursor: (!country || country === '__custom') ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { if (country && country !== '__custom') e.currentTarget.style.background = '#047857'; }}
          onMouseLeave={(e) => { if (country && country !== '__custom') e.currentTarget.style.background = '#059669'; }}
        >
          Find Routes
        </button>
      </div>

      {/* Results */}
      {results && results.length > 0 && (
        <div style={{ marginTop: 16, padding: 14, background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10 }}>
            Recommended Route
          </div>
          {results.map((r, i) => {
            const lc = leadColor(r.totalLeadDays);
            const targetCity = city || r.distributor.city || r.distributor.country;

            // Required-by check
            let onTimeMsg: string | null = null;
            let onTimeColor = '#059669';
            if (requiredBy && r.totalLeadDays > 0) {
              const reqDate = new Date(requiredBy);
              const arrivalDate = new Date();
              arrivalDate.setDate(arrivalDate.getDate() + r.totalLeadDays);
              if (arrivalDate <= reqDate) {
                onTimeMsg = `On time for ${requiredBy}`;
                onTimeColor = '#059669';
              } else {
                const orderBy = new Date(reqDate);
                orderBy.setDate(orderBy.getDate() - r.totalLeadDays);
                const orderByStr = orderBy.toISOString().split('T')[0];
                onTimeMsg = `At risk — order by ${orderByStr}`;
                onTimeColor = '#DC2626';
              }
            }

            return (
              <div key={i} style={{ marginBottom: i < results.length - 1 ? 14 : 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{r.distributor.name}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
                  {r.distributor.city ? `${r.distributor.city}, ${r.distributor.country}` : r.distributor.country}
                </div>
                {r.totalLeadDays > 0 && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: lc, marginTop: 4 }}>
                    ~{r.totalLeadDays} days to {targetCity}
                  </div>
                )}
                {onTimeMsg && (
                  <div style={{ fontSize: 12, fontWeight: 600, color: onTimeColor, marginTop: 2 }}>
                    {onTimeMsg}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No match fallback */}
      {noMatch && (
        <div style={{ marginTop: 16, padding: 14, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, fontSize: 13, color: '#92400E', lineHeight: 1.5 }}>
          {noMatch}
        </div>
      )}

      {/* Reset link */}
      {(results || noMatch) && (
        <button
          onClick={handleReset}
          style={{
            marginTop: 10, background: 'none', border: 'none', fontSize: 12,
            color: '#64748B', cursor: 'pointer', textDecoration: 'underline', padding: 0,
          }}
        >
          Reset
        </button>
      )}
    </div>
  );
}
