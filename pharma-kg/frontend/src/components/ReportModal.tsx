import { useEffect, useState } from 'react';
import axios from 'axios';
import { X, Download, Share2, AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ReportSection {
  heading: string;
  content: string;
}

interface ReportData {
  title: string;
  generated_at: string;
  sections: ReportSection[];
  risk_score: number;
  key_metrics: {
    total_nodes: number;
    countries: number;
    avg_lead_days: number;
    chokepoints: number;
  };
}

interface ReportModalProps {
  medicineName: string;
  onClose: () => void;
}

function riskColor(score: number): string {
  if (score <= 35) return '#059669';
  if (score <= 65) return '#D97706';
  return '#DC2626';
}

function riskLabel(score: number): string {
  if (score <= 35) return 'Low Risk';
  if (score <= 65) return 'Moderate Risk';
  return 'High Risk';
}

function RiskGauge({ score }: { score: number }) {
  const color = riskColor(score);
  const angle = (score / 100) * 180 - 90; // -90 (left) to 90 (right)
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="140" height="80" viewBox="0 0 140 80">
        {/* Track */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Filled arc */}
        <path
          d="M 10 75 A 60 60 0 0 1 130 75"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 188.5} 188.5`}
        />
        {/* Needle */}
        <line
          x1="70"
          y1="75"
          x2={70 + 45 * Math.cos((angle * Math.PI) / 180)}
          y2={75 + 45 * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="70" cy="75" r="4" fill={color} />
      </svg>
      <div style={{ fontSize: 28, fontWeight: 800, color, marginTop: -4 }}>{score}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{riskLabel(score)}</div>
    </div>
  );
}

export default function ReportModal({ medicineName, onClose }: ReportModalProps) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.post<ReportData>(`${API_BASE}/report/${encodeURIComponent(medicineName)}`);
        if (!cancelled) setReport(res.data);
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.data?.detail || 'Failed to generate report');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [medicineName]);

  const handlePrint = () => window.print();

  const handleShare = () => {
    const url = `${window.location.origin}?medicine=${encodeURIComponent(medicineName)}&report=1`;
    navigator.clipboard.writeText(url).then(() => {
      alert('Report link copied to clipboard');
    });
  };

  const now = report?.generated_at
    ? new Date(report.generated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[2000] flex items-start justify-center" style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', overflowY: 'auto', padding: '24px 16px' }}>
      <div
        id="report-printable"
        style={{ width: '100%', maxWidth: 820, background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.15)', position: 'relative' }}
      >
        {/* Close button — hidden when printing */}
        <button
          onClick={onClose}
          className="report-no-print"
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', zIndex: 10 }}
        >
          <X size={20} />
        </button>

        {/* Loading state */}
        {loading && (
          <div style={{ padding: '80px 40px', textAlign: 'center' }}>
            <svg className="animate-spin" width="36" height="36" viewBox="0 0 24 24" style={{ color: '#059669', margin: '0 auto 16px' }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Generating network intelligence report...</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 6 }}>Analyzing supply chain data with AI</div>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div style={{ padding: '60px 40px', textAlign: 'center' }}>
            <AlertTriangle size={32} color="#DC2626" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: '#DC2626' }}>{error}</div>
            <button onClick={onClose} style={{ marginTop: 20, padding: '8px 20px', background: '#F1F5F9', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#475569' }}>Close</button>
          </div>
        )}

        {/* Report content */}
        {!loading && report && (
          <div style={{ padding: '36px 44px 44px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, background: '#059669', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3"/><circle cx="5" cy="6" r="2"/><line x1="7" y1="7" x2="10" y2="10"/>
                    <circle cx="19" cy="6" r="2"/><line x1="17" y1="7" x2="14" y2="10"/>
                  </svg>
                </div>
                <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 16, color: '#0F172A' }}>PharmaTrace</span>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12, color: '#94A3B8' }}>
                <div>Generated {now}</div>
                <div>Supply Chain Intelligence Report</div>
              </div>
            </div>

            {/* Title */}
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', margin: '0 0 24px', letterSpacing: '-0.02em', textTransform: 'capitalize' }}>
              {medicineName}
            </h1>

            {/* Top row: metrics + gauge */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
              {/* Key metrics grid */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Network Nodes', value: report.key_metrics.total_nodes },
                  { label: 'Countries', value: report.key_metrics.countries },
                  { label: 'Avg Lead Days', value: report.key_metrics.avg_lead_days },
                  { label: 'Chokepoints', value: report.key_metrics.chokepoints },
                ].map((m) => (
                  <div key={m.label} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{m.value}</div>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>{m.label}</div>
                  </div>
                ))}
              </div>

              {/* Risk gauge */}
              <div style={{ width: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 8px' }}>
                <RiskGauge score={report.risk_score} />
              </div>
            </div>

            {/* Sections */}
            {report.sections.map((sec, i) => (
              <div key={i} style={{ marginBottom: 20, background: '#FAFBFC', border: '1px solid #F1F5F9', borderRadius: 10, padding: '18px 22px' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 6, background: '#059669', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                  {sec.heading}
                </h3>
                <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{sec.content}</p>
              </div>
            ))}

            {/* Action buttons — hidden when printing */}
            <div className="report-no-print" style={{ display: 'flex', gap: 10, marginTop: 28, justifyContent: 'flex-end' }}>
              <button
                onClick={handleShare}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}
              >
                <Share2 size={14} />
                Share
              </button>
              <button
                onClick={handlePrint}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', background: '#059669', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}
              >
                <Download size={14} />
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
