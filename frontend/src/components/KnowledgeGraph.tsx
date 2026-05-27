import { useEffect, useRef, useState, useCallback } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { SupplyChainData } from '../types/graph';
import { buildElements, nodeStyles, edgeStyles } from '../utils/layoutGraph';
import type { NodeType, TransportMode } from '../types/graph';

interface KnowledgeGraphProps {
  data: SupplyChainData;
  onNodeSelect: (nodeData: any, isShiftHeld: boolean) => void;
}

const LAYOUT_OPTIONS: any = {
  name: 'breadthfirst',
  directed: true,
  padding: 60,
  spacingFactor: 1.8,
  animate: true,
  animationDuration: 800,
  fit: true,
  nodeDimensionsIncludeLabels: true,
};

export default function KnowledgeGraph({ data, onNodeSelect }: KnowledgeGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    if (showHint) {
      const t = setTimeout(() => setShowHint(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showHint]);

  const handleFit = useCallback(() => {
    cyRef.current?.fit(undefined, 50);
  }, []);

  const handleRelayout = useCallback(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.layout(LAYOUT_OPTIONS).run();
  }, []);

  useEffect(() => {
    if (!data || !containerRef.current) return;

    const elements = buildElements(data);
    console.log('[KnowledgeGraph] element count:', elements.length);

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        // --- Nodes ---
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-wrap': 'wrap',
            'text-max-width': 'data(textWidth)' as any,
            'width': 'data(size)' as any,
            'height': 'data(size)' as any,
            'shape': 'data(nodeShape)' as any,
            'font-size': '9px',
            'font-weight': 700,
            'color': '#ffffff',
            'text-valign': 'center',
            'text-halign': 'center',
            'background-color': 'data(color)' as any,
            'border-width': 3,
            'border-color': 'data(borderColor)' as any,
            'text-outline-color': 'data(color)' as any,
            'text-outline-width': 1,
            'overlay-opacity': 0,
            'transition-property': 'border-width, border-color, background-color',
            'transition-duration': '0.15s' as any,
          },
        },
        {
          selector: 'node[nodeType="manufacturer"]',
          style: { 'font-size': '10px', 'font-weight': 800 },
        },
        {
          selector: 'node[nodeType="regional_dist"]',
          style: { 'font-size': '8px' },
        },
        {
          selector: 'node.highlighted',
          style: {
            'border-width': 5,
            'border-color': '#ffffff',
            'background-color': 'data(hoverColor)' as any,
          },
        },
        {
          selector: 'node:selected',
          style: { 'border-width': 5, 'border-color': '#ffffff' },
        },
        {
          selector: 'node:active',
          style: { 'overlay-opacity': 0 },
        },
        // --- Edges ---
        {
          selector: 'edge',
          style: {
            'width': 'data(width)' as any,
            'line-color': 'data(lineColor)' as any,
            'target-arrow-color': 'data(lineColor)' as any,
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.7,
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '8px',
            'font-weight': 500,
            'color': '#64748B',
            'text-background-color': '#F8FAFC',
            'text-background-opacity': 0.9,
            'text-background-padding': '2px',
            'line-style': 'data(lineStyle)' as any,
          },
        },
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': '#059669',
            'target-arrow-color': '#059669',
            'width': 3,
            'line-style': 'solid',
          },
        },
      ],
      layout: LAYOUT_OPTIONS,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      minZoom: 0.2,
      maxZoom: 3,
    });

    cyRef.current = cy;

    // --- Tap on node → open panel or comparison ---
    cy.on('tap', 'node', (evt) => {
      const d = evt.target.data();
      if (!d.isLeaf) return;
      const isShiftHeld = (evt.originalEvent as MouseEvent)?.shiftKey || false;

      onNodeSelect(
        {
          supplierName: d.supplierName,
          company_name: d.supplierName,
          name: d.supplierName,
          country: d.country,
          city: d.city || '',
          certifications: d.certifications ? d.certifications.split(',').filter(Boolean) : [],
          annualVolume: d.annualVolume || '',
          marketShare: d.marketShare || 0,
          riskFactors: d.riskFactors ? d.riskFactors.split(',').filter(Boolean) : [],
          notes: d.notes || '',
          nodeType: d.nodeType,
          lat: d.lat,
          lng: d.lng,
        },
        isShiftHeld
      );
    });

    // Tap background → close panel
    cy.on('tap', (evt) => {
      if (evt.target === cy) onNodeSelect(null, false);
    });

    // --- Hover highlight ---
    cy.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      node.addClass('highlighted');
      node.connectedEdges().addClass('highlighted');
      if (containerRef.current) containerRef.current.style.cursor = 'pointer';

      const d = node.data();
      const tooltip = tooltipRef.current;
      if (!tooltip || !containerRef.current) return;
      const pos = node.renderedPosition();
      const rect = containerRef.current.getBoundingClientRect();

      const lines = [`<strong>${d.label}</strong>`];
      if (d.city && d.country) lines.push(`${d.city}, ${d.country}`);
      else if (d.country) lines.push(d.country);
      if (d.certifications) {
        const certs = d.certifications.split(',').filter(Boolean);
        if (certs.length) lines.push(certs.join(', '));
      }
      if (d.annualVolume) lines.push(`Vol: ${d.annualVolume}`);
      if (d.riskFactors) {
        const rf = d.riskFactors.split(',').filter(Boolean);
        if (rf.length) lines.push(`Risk: ${rf.join(', ')}`);
      }

      tooltip.innerHTML = lines.join('<br/>');
      tooltip.style.left = `${rect.left + pos.x + 15}px`;
      tooltip.style.top = `${rect.top + pos.y - 15}px`;
      tooltip.style.display = 'block';
    });

    cy.on('mouseout', 'node', (evt) => {
      evt.target.removeClass('highlighted');
      evt.target.connectedEdges().removeClass('highlighted');
      if (containerRef.current) containerRef.current.style.cursor = 'default';
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    });

    cy.on('pan zoom', () => {
      if (tooltipRef.current) tooltipRef.current.style.display = 'none';
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [data, onNodeSelect]);

  // --- Legend data ---
  const nodeEntries = (Object.entries(nodeStyles) as [NodeType, typeof nodeStyles[NodeType]][]);
  const edgeEntries = (Object.entries(edgeStyles) as [TransportMode, typeof edgeStyles[TransportMode]][]);

  return (
    <div className="relative w-full h-full">
      {/* Cytoscape canvas */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ background: '#F8FAFC' }}
      />

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-50 pointer-events-none"
        style={{
          display: 'none',
          maxWidth: 260,
          padding: '8px 12px',
          background: '#0f172a',
          color: '#f8fafc',
          fontSize: 12,
          lineHeight: 1.5,
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
        }}
      />

      {/* Floating controls */}
      <div
        className="absolute top-4 left-4 flex items-center z-10"
        style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', padding: 4 }}
      >
        <button
          onClick={handleFit}
          className="text-[13px] font-medium border-none bg-transparent cursor-pointer transition-colors"
          style={{ padding: '8px 14px', color: '#334155', borderRadius: 6 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Fit to Screen
        </button>
        <div style={{ width: 1, height: 20, background: '#E2E8F0' }} />
        <button
          onClick={handleRelayout}
          className="text-[13px] font-medium border-none bg-transparent cursor-pointer transition-colors"
          style={{ padding: '8px 14px', color: '#334155', borderRadius: 6 }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Re-layout
        </button>
      </div>

      {/* Legend panel — bottom left */}
      <div
        className="absolute bottom-4 left-4 z-10"
        style={{
          width: 200,
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          padding: '14px 16px',
          fontSize: 11,
          color: '#475569',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 11, color: '#0F172A', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Legend</div>

        {/* Node types */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 10, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Nodes</div>
          {nodeEntries.map(([key, s]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                width: s.shape === 'rhomboid' ? 10 : (s.shape === 'rectangle' ? 14 : 10),
                height: s.shape === 'rhomboid' ? 10 : (s.shape === 'rectangle' ? 9 : 10),
                background: s.color,
                borderRadius: s.shape === 'ellipse' ? '50%' : (s.shape === 'round-rectangle' ? 3 : (s.shape === 'rhomboid' ? 1 : 2)),
                transform: s.shape === 'rhomboid' ? 'rotate(45deg) scale(0.75)' : 'none',
                flexShrink: 0,
              }} />
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Edge types */}
        <div>
          <div style={{ fontWeight: 600, fontSize: 10, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Transport</div>
          {edgeEntries.map(([key, s]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <svg width="24" height="6" style={{ flexShrink: 0 }}>
                <line
                  x1="0" y1="3" x2="24" y2="3"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeDasharray={s.lineStyle === 'dashed' ? '6,3' : (s.lineStyle === 'dotted' ? '2,2' : 'none')}
                />
              </svg>
              <span style={{ textTransform: 'capitalize' }}>{s.label}</span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <svg width="24" height="6" style={{ flexShrink: 0 }}>
              <line x1="0" y1="3" x2="24" y2="3" stroke="#DC2626" strokeWidth="2.5" />
            </svg>
            <span style={{ color: '#DC2626' }}>High risk</span>
          </div>
        </div>
      </div>

      {/* Shift+click hint */}
      {showHint && data && (
        <div
          className="absolute bottom-4 right-4 flex items-center gap-2 z-20 pointer-events-none"
          style={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '10px 14px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            animation: 'fadeIn 0.3s ease',
            color: '#64748B',
            fontSize: 12,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Shift + click to compare nodes
        </div>
      )}
    </div>
  );
}
