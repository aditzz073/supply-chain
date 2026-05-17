import { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ShortageDetail {
  name: string;
  status: string;
  reason: string;
}

interface ShortageData {
  shortage: boolean;
  count?: number;
  details?: ShortageDetail[];
}

interface ShortageAlertProps {
  medicine: string;
}

export default function ShortageAlert({ medicine }: ShortageAlertProps) {
  const [data, setData] = useState<ShortageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!medicine) return;
    setLoading(true);
    setData(null);

    axios
      .get<ShortageData>(`${API_BASE}/shortage`, { params: { medicine } })
      .then((res) => setData(res.data))
      .catch(() => setData({ shortage: false }))
      .finally(() => setLoading(false));
  }, [medicine]);

  if (loading) {
    return (
      <div className="shrink-0 z-20" style={{ padding: '0 32px' }}>
        <div className="h-[48px] rounded-lg animate-pulse" style={{ background: '#F1F5F9' }} />
      </div>
    );
  }

  if (!data) return null;

  if (data.shortage) {
    const reasons = data.details
      ?.map((d) => d.reason)
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(' / ');

    return (
      <div className="shrink-0 z-20" style={{ padding: '0 32px', animation: 'fadeIn 0.3s ease' }}>
        <div
          className="flex items-center justify-between gap-4"
          style={{
            background: '#FEF2F2',
            borderLeft: '4px solid #DC2626',
            padding: '12px 32px',
            borderRadius: 8,
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <AlertTriangle size={16} color="#DC2626" className="shrink-0" />
            <p className="text-sm" style={{ color: '#991B1B', margin: 0 }}>
              <span className="font-bold">Active FDA Shortage:</span>{' '}
              {medicine}
              {data.count ? ` (${data.count} report${data.count > 1 ? 's' : ''})` : ''}
              {reasons ? ` \u2014 ${reasons}` : ''}
            </p>
          </div>
          <a
            href="https://www.accessdata.fda.gov/scripts/drugshortages/"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[13px] font-medium whitespace-nowrap underline"
            style={{ color: '#334155' }}
          >
            View FDA Page
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 z-20" style={{ padding: '0 32px', animation: 'fadeIn 0.3s ease' }}>
      <div
        className="flex items-center gap-3"
        style={{
          background: '#F0FDF4',
          borderLeft: '4px solid #059669',
          padding: '12px 32px',
          borderRadius: 8,
        }}
      >
        <CheckCircle size={16} color="#059669" className="shrink-0" />
        <p className="text-sm" style={{ color: '#166534', margin: 0 }}>
          No active FDA shortage found for <strong>{medicine}</strong>
        </p>
      </div>
    </div>
  );
}
