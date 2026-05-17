import { X } from 'lucide-react';

const categoryColors: Record<string, string> = {
  api_suppliers: '#059669',
  brand_manufacturers: '#0284C7',
  distributors: '#D97706',
  regulatory_bodies: '#DC2626',
  key_brands: '#7C3AED',
};

interface ComparisonTrayProps {
  items: any[];
  onRemove: (supplierName: string) => void;
  onClear: () => void;
  onCompare: () => void;
}

export default function ComparisonTray({ items, onRemove, onClear, onCompare }: ComparisonTrayProps) {
  if (items.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[1200]"
      style={{
        height: 72,
        background: '#fff',
        borderTop: '1px solid #E2E8F0',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div style={{ height: '100%', maxWidth: 1200, margin: '0 auto', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#64748B', whiteSpace: 'nowrap' }}>
            Comparing {items.length} supplier{items.length > 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
            {items.map((item) => (
              <div
                key={item.supplierName}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: 6,
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: categoryColors[item.nodeType] || '#059669', flexShrink: 0 }} />
                <span style={{ fontWeight: 500, color: '#0F172A', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.supplierName}
                </span>
                <button
                  onClick={() => onRemove(item.supplierName)}
                  style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}
                  className="hover:text-gray-600"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button
            onClick={onClear}
            style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 500, color: '#64748B', cursor: 'pointer' }}
            className="hover:text-gray-800"
          >
            Clear
          </button>
          <button
            onClick={onCompare}
            disabled={items.length < 2}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              background: '#059669',
              border: 'none',
              cursor: items.length < 2 ? 'not-allowed' : 'pointer',
              opacity: items.length < 2 ? 0.4 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
