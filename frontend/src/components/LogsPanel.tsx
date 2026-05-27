import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { X, Clock, Globe, TriangleAlert, TrendingUp, TrendingDown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface LogEntry {
  id: string;
  medicine_name: string;
  searched_at: string;
  node_count: number;
  geographic_risk: string;
}

interface LogsPanelProps {
  open: boolean;
  onClose: () => void;
  onSelectLog: (medicineName: string, searchedAt: string) => void;
}

const riskColors: Record<string, { bg: string; text: string; dot: string }> = {
  low:    { bg: '#F0FDF4', text: '#065F46', dot: '#059669' },
  medium: { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
  high:   { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function LogsPanel({ open, onClose, onSelectLog }: LogsPanelProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get<LogEntry[]>(`${API_BASE}/logs`);
      setLogs(res.data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchLogs();
  }, [open, fetchLogs]);

  // Compute deltas: for each log, compare to the next entry with the same medicine
  const deltaMap = new Map<string, number | null>();
  const seen = new Map<string, number>();
  // logs are newest-first
  for (let i = logs.length - 1; i >= 0; i--) {
    const entry = logs[i];
    const key = entry.medicine_name;
    const prev = seen.get(key);
    if (prev !== undefined) {
      deltaMap.set(entry.id, entry.node_count - prev);
    } else {
      deltaMap.set(entry.id, null);
    }
    seen.set(key, entry.node_count);
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[1500]"
          style={{ background: 'rgba(15,23,42,0.2)', backdropFilter: 'blur(2px)' }}
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 bottom-0 z-[1600]"
        style={{
          width: 400,
          background: '#fff',
          borderRight: '1px solid #E2E8F0',
          boxShadow: open ? '4px 0 24px rgba(0,0,0,0.08)' : 'none',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock size={18} color="#059669" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#0F172A', margin: 0 }}>Network Logs</h2>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#94A3B8' }}
            className="hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {loading && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
              Loading logs...
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#94A3B8', fontSize: 14 }}>
              No searches yet. Search a medicine to get started.
            </div>
          )}

          {!loading && logs.map((entry) => {
            const risk = riskColors[entry.geographic_risk] || riskColors.low;
            const delta = deltaMap.get(entry.id);

            return (
              <button
                key={entry.id}
                onClick={() => onSelectLog(entry.medicine_name, entry.searched_at)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '16px 24px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid #F1F5F9',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                className="hover:bg-gray-50"
              >
                {/* Top row: medicine name + time */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', textTransform: 'capitalize' }}>
                    {entry.medicine_name}
                  </span>
                  <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }} title={formatFullDate(entry.searched_at)}>
                    {formatDate(entry.searched_at)}
                  </span>
                </div>

                {/* Bottom row: badges */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* Node count */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: '#475569', background: '#F1F5F9', padding: '3px 8px', borderRadius: 6 }}>
                    <Globe size={11} />
                    {entry.node_count} nodes
                  </span>

                  {/* Risk badge */}
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', padding: '3px 8px', borderRadius: 6, background: risk.bg, color: risk.text }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: risk.dot }} />
                    {entry.geographic_risk} risk
                  </span>

                  {/* Delta indicator */}
                  {delta != null && delta !== 0 && (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 12,
                      fontWeight: 600,
                      color: delta > 0 ? '#059669' : '#DC2626',
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: delta > 0 ? '#F0FDF4' : '#FEF2F2',
                    }}>
                      {delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {delta > 0 ? `+${delta}` : String(delta)} node{Math.abs(delta) !== 1 ? 's' : ''} since last
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#94A3B8', textAlign: 'center', flexShrink: 0 }}>
          Showing last {logs.length} searches
        </div>
      </div>
    </>
  );
}
