import { useCallback } from 'react';
import { X, Download, Mail } from 'lucide-react';

const categoryLabels: Record<string, string> = {
  api_suppliers: 'API Supplier',
  brand_manufacturers: 'Brand Manufacturer',
  distributors: 'Distributor',
  regulatory_bodies: 'Regulatory Body',
  key_brands: 'Key Brand',
};

const categoryColors: Record<string, string> = {
  api_suppliers: '#059669',
  brand_manufacturers: '#0284C7',
  distributors: '#D97706',
  regulatory_bodies: '#DC2626',
  key_brands: '#7C3AED',
};

interface ComparisonModalProps {
  items: any[];
  onClose: () => void;
}

export default function ComparisonModal({ items, onClose }: ComparisonModalProps) {
  const exportCSV = useCallback(() => {
    const headers = ['Attribute', ...items.map((s) => s.supplierName)];
    const rows = [
      ['Country', ...items.map((s) => s.country || '')],
      ['Category', ...items.map((s) => categoryLabels[s.nodeType] || '')],
      ['Certifications', ...items.map((s) => Array.isArray(s.certifications) ? s.certifications.join('; ') : (s.certifications || ''))],
      ['Annual Capacity (kg)', ...items.map((s) => s.capacity || '')],
      ['Approval Status', ...items.map((s) => s.approvalStatus || '')],
      ['Dosage Forms', ...items.map((s) => s.dosageForms || '')],
      ['Email', ...items.map((s) => s.email || '')],
      ['Website', ...items.map((s) => s.website || '')],
    ];
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplier_comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [items]);

  const sendInquiryToAll = useCallback(() => {
    const emails = items.map((s) => s.email).filter(Boolean).join(',');
    if (emails) window.open(`mailto:?bcc=${emails}&subject=Supply%20Inquiry`, '_self');
  }, [items]);

  const capacities = items.map((s) => parseFloat(s.capacity) || 0);
  const maxCapacity = Math.max(...capacities);
  const certCounts = items.map((s) => {
    const c = s.certifications;
    if (Array.isArray(c)) return c.length;
    if (typeof c === 'string' && c) return c.split(',').filter(Boolean).length;
    return 0;
  });
  const maxCerts = Math.max(...certCounts);

  const rows: { label: string; key: string; render: (item: any, idx: number) => React.ReactNode }[] = [
    {
      label: 'Company Name',
      key: 'name',
      render: (item) => <span style={{ fontWeight: 600, color: '#0F172A' }}>{item.supplierName}</span>,
    },
    {
      label: 'Category',
      key: 'category',
      render: (item) => {
        const color = categoryColors[item.nodeType] || '#059669';
        return (
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 6, background: color + '18', color }}>
            {categoryLabels[item.nodeType] || item.nodeType}
          </span>
        );
      },
    },
    {
      label: 'Country',
      key: 'country',
      render: (item) => <span>{item.country || <span style={{ color: '#CBD5E1' }}>—</span>}</span>,
    },
    {
      label: 'Certifications',
      key: 'certs',
      render: (item, idx) => {
        const certs = Array.isArray(item.certifications) ? item.certifications : item.certifications ? String(item.certifications).split(',').filter(Boolean) : [];
        const isBest = maxCerts > 0 && certs.length === maxCerts;
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {certs.length === 0 && <span style={{ color: '#CBD5E1' }}>—</span>}
            {certs.map((c: string, j: number) => (
              <span key={j} style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: isBest ? '#D1FAE5' : '#F1F5F9', color: isBest ? '#065F46' : '#475569' }}>
                {c}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      label: 'Annual Capacity',
      key: 'capacity',
      render: (item, idx) => {
        const val = parseFloat(item.capacity) || 0;
        const isBest = maxCapacity > 0 && val === maxCapacity;
        if (!item.capacity) return <span style={{ color: '#CBD5E1' }}>—</span>;
        return isBest
          ? <span style={{ fontWeight: 600, color: '#065F46', background: '#D1FAE5', padding: '2px 8px', borderRadius: 4 }}>{item.capacity} kg</span>
          : <span>{item.capacity} kg</span>;
      },
    },
    {
      label: 'Approval Status',
      key: 'approval',
      render: (item) => item.approvalStatus
        ? <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#F0FDF4', color: '#065F46' }}>{item.approvalStatus}</span>
        : <span style={{ color: '#CBD5E1' }}>—</span>,
    },
    {
      label: 'Dosage Forms',
      key: 'dosage',
      render: (item) => <span>{item.dosageForms || <span style={{ color: '#CBD5E1' }}>—</span>}</span>,
    },
    {
      label: 'Contact Email',
      key: 'email',
      render: (item) => item.email
        ? <a href={`mailto:${item.email}`} style={{ color: '#059669', fontSize: 14, wordBreak: 'break-all' }} className="hover:underline">{item.email}</a>
        : <span style={{ color: '#CBD5E1' }}>—</span>,
    },
    {
      label: 'Website',
      key: 'website',
      render: (item) => item.website
        ? <a href={item.website} target="_blank" rel="noreferrer" style={{ color: '#059669', fontSize: 14, wordBreak: 'break-all' }} className="hover:underline">{item.website}</a>
        : <span style={{ color: '#CBD5E1' }}>—</span>,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[1800] flex items-center justify-center"
      style={{ backdropFilter: 'blur(4px)', background: 'rgba(15,23,42,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          maxWidth: 880,
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.14)',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 32px', borderBottom: '1px solid #F1F5F9', flexShrink: 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', margin: 0 }}>Compare Suppliers</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#94A3B8' }} className="hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 32px 32px' }}>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '16px 16px 12px 0', width: 140 }}>
                  Attribute
                </th>
                {items.map((item) => (
                  <th key={item.supplierName} style={{ textAlign: 'left', padding: '16px 16px 12px', fontWeight: 700, color: '#0F172A' }}>
                    <div>{item.supplierName}</div>
                    <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '1px 6px', borderRadius: 4, background: (categoryColors[item.nodeType] || '#059669') + '18', color: categoryColors[item.nodeType] || '#059669', marginTop: 4 }}>
                      {categoryLabels[item.nodeType] || ''}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={row.key} style={{ background: ri % 2 === 1 ? '#F8FAFC' : '#fff', borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '14px 16px 14px 0', fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                    {row.label}
                  </td>
                  {items.map((item, idx) => (
                    <td key={item.supplierName} style={{ padding: '14px 16px', fontSize: 14, color: '#0F172A', verticalAlign: 'top' }}>
                      {row.render(item, idx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, padding: '20px 32px', borderTop: '1px solid #F1F5F9', flexShrink: 0 }}>
          <button
            onClick={exportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#334155', background: '#fff', border: '1px solid #E2E8F0', cursor: 'pointer' }}
            className="hover:bg-gray-50 transition-colors"
          >
            <Download size={15} />
            Export CSV
          </button>
          <button
            onClick={sendInquiryToAll}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#fff', background: '#059669', border: 'none', cursor: 'pointer' }}
            className="hover:opacity-90 transition-opacity"
          >
            <Mail size={15} />
            Send Inquiry to All
          </button>
        </div>
      </div>
    </div>
  );
}
