import { useState, useCallback } from 'react';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';
import { Network, ShieldCheck, GitCompare, Search, ScrollText, FileDown } from 'lucide-react';
import KnowledgeGraph from './components/KnowledgeGraph';
import NetworkMap from './components/NetworkMap';
import SupplierPanel from './components/SupplierPanel';
import ShortageAlert from './components/ShortageAlert';
import ComparisonTray from './components/ComparisonTray';
import ComparisonModal from './components/ComparisonModal';
import LogsPanel from './components/LogsPanel';
import ReportModal from './components/ReportModal';
import DeliveryZonePanel from './components/DeliveryZonePanel';
import { useGraphData } from './hooks/useGraphData';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/* ── Shared Navbar Logo ────────────────────────────────────────────── */
function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ width: 32, height: 32, background: '#059669', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <circle cx="5" cy="6" r="2"/><line x1="7" y1="7" x2="10" y2="10"/>
          <circle cx="19" cy="6" r="2"/><line x1="17" y1="7" x2="14" y2="10"/>
          <circle cx="5" cy="18" r="2"/><line x1="7" y1="17" x2="10" y2="14"/>
          <circle cx="19" cy="18" r="2"/><line x1="17" y1="17" x2="14" y2="14"/>
        </svg>
      </div>
      <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 20, color: '#0F172A', letterSpacing: '-0.01em' }}>PharmaTrace</span>
    </div>
  );
}

/* ── Landing Page ──────────────────────────────────────────────────── */
function LandingPage({ onSearch, loading }: { onSearch: (q: string) => void; loading: boolean }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) onSearch(query.trim());
  };

  const quickSearches = ['Metformin', 'Amoxicillin', 'Levothyroxine'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Navbar */}
      <nav style={{ height: 60, padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', background: '#fff', flexShrink: 0 }}>
        <Logo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {CLERK_KEY ? (
            <>
              <SignedIn><UserButton /></SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 500, color: '#475569', cursor: 'pointer' }}>Sign In</button>
                </SignInButton>
                <button style={{ padding: '8px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Get Started
                </button>
              </SignedOut>
            </>
          ) : (
            <button style={{ padding: '8px 20px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Get Started
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
        {/* Pill badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #D1FAE5', background: '#F0FDF4', borderRadius: 20, padding: '4px 14px', fontSize: 13, color: '#065F46' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} />
          Trusted by 200+ hospital procurement teams
        </div>

        {/* Headline */}
        <h1 style={{ maxWidth: 640, textAlign: 'center', fontSize: 'clamp(36px, 8vw, 52px)', fontWeight: 800, lineHeight: 1.1, color: '#0F172A', letterSpacing: '-0.03em', marginTop: 28, marginBottom: 0 }}>
          Find <span style={{ color: '#059669', fontStyle: 'italic' }}>verified</span> pharma suppliers in seconds
        </h1>

        {/* Subheadline */}
        <p style={{ maxWidth: 520, textAlign: 'center', fontSize: 18, color: '#64748B', lineHeight: 1.6, marginTop: 20, marginBottom: 0 }}>
          PharmaTrace maps the global supply chain for any medicine. API suppliers, manufacturers, distributors, regulatory bodies and real-time shortage alerts, all in one place.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSubmit} style={{ maxWidth: 580, width: '100%', marginTop: 48 }}>
          <div
            className="search-hero-container"
            style={{ display: 'flex', alignItems: 'center', padding: '8px 8px 8px 24px', background: '#fff', border: '1.5px solid #D1D5DB', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06), 0 0 0 0px #059669', transition: 'border-color 0.2s, box-shadow 0.2s' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06), 0 0 0 3px rgba(5,150,105,0.12)'; }}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06), 0 0 0 0px #059669'; } }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any medicine..."
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 16, fontFamily: 'Inter, sans-serif', color: '#0F172A', background: 'transparent' }}
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              style={{ padding: '13px 28px', background: '#059669', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 600, fontSize: 15, fontFamily: 'Inter, sans-serif', cursor: loading || !query.trim() ? 'not-allowed' : 'pointer', opacity: loading || !query.trim() ? 0.5 : 1, transition: 'background 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#047857'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#059669'; }}
            >
              {loading ? 'Searching...' : 'Search \u2192'}
            </button>
          </div>
        </form>

        {/* Quick search chips */}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {quickSearches.map((q) => (
            <button
              key={q}
              onClick={() => onSearch(q)}
              style={{ padding: '7px 18px', background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#059669'; e.currentTarget.style.color = '#059669'; e.currentTarget.style.background = '#F0FDF4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = '#fff'; }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Stats bar */}
        <div style={{ width: '100%', marginTop: 80, borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0', maxWidth: 700, margin: '0 auto' }}>
            {[
              { num: '12,000+', label: 'Verified Suppliers' },
              { num: '180+', label: 'Countries Covered' },
              { num: '24hr', label: 'Data Refresh Rate' },
            ].map((stat, i) => (
              <div key={stat.num} style={{ flex: 1, textAlign: 'center', borderLeft: i > 0 ? '1px solid #E2E8F0' : 'none' }}>
                <div style={{ fontSize: 32, fontWeight: 800, color: '#059669' }}>{stat.num}</div>
                <div style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, maxWidth: 960, width: '100%', margin: '80px auto 0', padding: '0 24px' }}>
          {[
            { icon: <Network size={24} />, title: 'Interactive Knowledge Graph', body: 'Visualize the entire supply chain for any medicine. Drag, zoom, and explore supplier relationships visually.' },
            { icon: <ShieldCheck size={24} />, title: 'FDA Shortage Alerts', body: 'Real-time alerts when a drug appears on the FDA shortage list. Know before your stock runs out.' },
            { icon: <GitCompare size={24} />, title: 'Supplier Comparison', body: 'Shift-click any suppliers to compare certifications, capacity, and contact info side by side.' },
          ].map((card) => (
            <div key={card.title} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
              <div style={{ color: '#059669', marginBottom: 16 }}>{card.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: '0 0 8px' }}>{card.title}</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, margin: 0 }}>{card.body}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer style={{ width: '100%', marginTop: 120, borderTop: '1px solid #E2E8F0', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#94A3B8' }}>
          <span>&copy; 2026 PharmaTrace. Built for hospital procurement teams.</span>
          <div style={{ display: 'flex', gap: 24 }}>
            <a href="#" style={{ color: '#94A3B8', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: '#94A3B8', textDecoration: 'none' }}>Terms</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ── App Page (Graph View) ─────────────────────────────────────────── */
function AppPage({
  data,
  loading,
  error,
  search,
  searchHistory,
  onGoHome,
  saveSupplier,
}: {
  data: any;
  loading: boolean;
  error: string | null;
  search: (q: string) => void;
  searchHistory: string[];
  onGoHome: () => void;
  saveSupplier: (medicineName: string, supplierData: any) => Promise<boolean>;
}) {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [comparisonList, setComparisonList] = useState<any[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [navQuery, setNavQuery] = useState('');
  const [logsOpen, setLogsOpen] = useState(false);
  const [histBanner, setHistBanner] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'map'>('graph');
  const [showReport, setShowReport] = useState(false);
  const [hlNodes, setHlNodes] = useState<string[]>([]);
  const [hlEdges, setHlEdges] = useState<string[]>([]);

  const handleSave = useCallback(
    async (medicineName: string, supplierData: any) => {
      const ok = await saveSupplier(medicineName, supplierData);
      setSaveMsg(ok ? 'Saved!' : 'Save failed');
      setTimeout(() => setSaveMsg(null), 2000);
    },
    [saveSupplier]
  );

  const handleNodeClick = useCallback(
    (nodeData: any, isShiftHeld: boolean) => {
      if (!nodeData) { setSelectedNode(null); return; }
      if (isShiftHeld) {
        setComparisonList((prev) => {
          if (prev.find((n) => n.supplierName === nodeData.supplierName)) return prev;
          if (prev.length >= 3) return prev;
          return [...prev, nodeData];
        });
      } else {
        setSelectedNode(nodeData);
      }
    },
    []
  );

  const handleNavSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (navQuery.trim()) {
      setHistBanner(null);
      search(navQuery.trim());
    }
  };

  const handleSelectLog = useCallback(
    (medicineName: string, searchedAt: string) => {
      setLogsOpen(false);
      const d = new Date(searchedAt);
      const label = d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      setHistBanner(`Viewing network from ${label}. Current network may differ.`);
      search(medicineName);
    },
    [search]
  );

  const panelOpen = selectedNode !== null;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#F8FAFC' }}>
      {/* App navbar */}
      <nav style={{ height: 60, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', background: '#fff', flexShrink: 0, zIndex: 20 }}>
        <Logo onClick={onGoHome} />
        <form onSubmit={handleNavSearch} style={{ display: 'flex', alignItems: 'center', gap: 0, width: 400 }}>
          <input
            type="text"
            value={navQuery}
            onChange={(e) => setNavQuery(e.target.value)}
            placeholder="Search medicine..."
            style={{ flex: 1, height: 40, padding: '0 14px', border: '1px solid #E2E8F0', borderRight: 'none', borderRadius: '8px 0 0 8px', fontSize: 14, color: '#0F172A', outline: 'none', background: '#fff' }}
          />
          <button type="submit" style={{ height: 40, padding: '0 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: '0 8px 8px 0', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <Search size={16} />
          </button>
        </form>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data && (
            <button
              onClick={() => setShowReport(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#059669', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#047857')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#059669')}
            >
              <FileDown size={14} />
              Generate Report
            </button>
          )}
          <button
            onClick={() => setLogsOpen(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer' }}
            className="hover:bg-gray-50 transition-colors"
          >
            <ScrollText size={14} />
            Logs
          </button>
          <button onClick={onGoHome} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, color: '#475569', cursor: 'pointer' }}>
            New Search
          </button>
        </div>
      </nav>

      {/* Error bar */}
      {error && (
        <div style={{ padding: '8px 32px', background: '#FEE2E2', borderBottom: '1px solid #FECACA', color: '#DC2626', fontSize: 14, flexShrink: 0, zIndex: 20 }}>
          {error}
        </div>
      )}

      {/* Historical banner */}
      {histBanner && (
        <div style={{ padding: '10px 32px', background: '#FEF3C7', borderBottom: '1px solid #FDE68A', color: '#92400E', fontSize: 13, fontWeight: 500, flexShrink: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{histBanner}</span>
          <button onClick={() => setHistBanner(null)} style={{ background: 'none', border: 'none', color: '#92400E', cursor: 'pointer', fontWeight: 600, fontSize: 12, textDecoration: 'underline' }}>Dismiss</button>
        </div>
      )}

      {/* Shortage alert */}
      {data && <div style={{ padding: '8px 0', flexShrink: 0, zIndex: 20 }}><ShortageAlert medicine={data.medicine.name} /></div>}

      {/* Main content */}
      <div className="flex-1 relative overflow-hidden">
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-40" style={{ background: 'rgba(255,255,255,0.85)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <svg className="animate-spin" width="36" height="36" viewBox="0 0 24 24" style={{ color: '#059669' }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>Fetching supply chain data...</span>
            </div>
          </div>
        )}

        {/* View toggle — centered top of graph/map area */}
        {data && (
          <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 1100, display: 'flex', borderRadius: 12, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.10)' }}>
            {(['graph', 'map'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '10px 28px',
                  fontSize: 15,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: viewMode === mode ? '#059669' : '#fff',
                  color: viewMode === mode ? '#fff' : '#475569',
                  transition: 'all 0.15s',
                  letterSpacing: '-0.01em',
                }}
              >
                {mode === 'graph' ? 'Graph View' : 'Map View'}
              </button>
            ))}
          </div>
        )}

        {/* Graph canvas */}
        {data && viewMode === 'graph' && (
          <div className="absolute top-0 left-0 bottom-0 transition-all duration-300" style={{ right: panelOpen ? 400 : 0 }}>
            <KnowledgeGraph data={data} onNodeSelect={handleNodeClick} />
          </div>
        )}

        {/* Map canvas + delivery zone panel */}
        {data && viewMode === 'map' && (
          <div className="absolute top-0 left-0 bottom-0 transition-all duration-300" style={{ right: panelOpen ? 400 : 0 }}>
            <NetworkMap data={data} onNodeSelect={handleNodeClick} highlightNodeIds={hlNodes} highlightEdgeIds={hlEdges} />
            <DeliveryZonePanel
              data={data}
              onHighlight={(nIds, eIds) => { setHlNodes(nIds); setHlEdges(eIds); }}
              onReset={() => { setHlNodes([]); setHlEdges([]); }}
            />
          </div>
        )}

        {/* Supplier panel */}
        <div
          className="absolute top-0 bottom-0 right-0 w-[400px] transition-transform duration-300 ease-in-out z-[1300]"
          style={{ transform: panelOpen ? 'translateX(0)' : 'translateX(100%)' }}
        >
          {selectedNode && (
            <SupplierPanel selected={selectedNode} onClose={() => setSelectedNode(null)} onSave={handleSave} />
          )}
        </div>

        {/* Save toast */}
        {saveMsg && (
          <div className="fixed z-50" style={{ bottom: 24, right: 24, padding: '10px 18px', background: '#059669', color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,0.12)' }}>
            {saveMsg}
          </div>
        )}
      </div>

      {/* Comparison tray */}
      <ComparisonTray
        items={comparisonList}
        onRemove={(name) => setComparisonList((prev) => prev.filter((s) => s.supplierName !== name))}
        onClear={() => setComparisonList([])}
        onCompare={() => setShowComparison(true)}
      />

      {/* Comparison modal */}
      {showComparison && comparisonList.length >= 2 && (
        <ComparisonModal items={comparisonList} onClose={() => setShowComparison(false)} />
      )}

      {/* Logs drawer */}
      <LogsPanel open={logsOpen} onClose={() => setLogsOpen(false)} onSelectLog={handleSelectLog} />

      {/* Report modal */}
      {showReport && data && (
        <ReportModal medicineName={data.medicine.name} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}

/* ── Root App ──────────────────────────────────────────────────────── */
function AppContent() {
  const { data, loading, error, search, searchHistory, saveSupplier, clearData } = useGraphData();

  const handleGoHome = useCallback(() => {
    if (clearData) clearData();
  }, [clearData]);

  if (!data && !loading) {
    return <LandingPage onSearch={search} loading={loading} />;
  }

  return (
    <AppPage
      data={data}
      loading={loading}
      error={error}
      search={search}
      searchHistory={searchHistory}
      onGoHome={handleGoHome}
      saveSupplier={saveSupplier}
    />
  );
}

export default function App() {
  if (CLERK_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_KEY}>
        <AppContent />
      </ClerkProvider>
    );
  }
  return <AppContent />;
}
