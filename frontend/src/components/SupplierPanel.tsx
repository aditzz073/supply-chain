import { MapPin, Mail, Phone, Globe, FlaskConical, CheckCircle, Factory, Pill, X, Bookmark } from 'lucide-react';

interface SupplierPanelProps {
  selected: any;
  onClose: () => void;
  onSave: (medicineName: string, supplierData: any) => void;
}

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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      {children}
    </p>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
      <span style={{ color: '#94A3B8', marginTop: 2, flexShrink: 0 }}>{icon}</span>
      <div>
        <Label>{label}</Label>
        <div style={{ marginTop: 2, fontSize: 14, color: '#0F172A' }}>{value}</div>
      </div>
    </div>
  );
}

export default function SupplierPanel({ selected, onClose, onSave }: SupplierPanelProps) {
  const data = selected;
  if (!data) return null;

  const nodeType: string = data.nodeType || '';
  const categoryLabel = categoryLabels[nodeType] || 'Supplier';
  const categoryColor = categoryColors[nodeType] || '#059669';
  const displayName = data.company_name || data.name || data.brand_name || '';

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#fff', borderLeft: '1px solid #E2E8F0' }}>
      {/* Color strip */}
      <div style={{ height: 6, background: categoryColor }} />

      {/* Header */}
      <div style={{ padding: 24, position: 'relative' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6 }}
          className="hover:bg-gray-100 transition-colors"
        >
          <X size={20} color="#94A3B8" />
        </button>

        <span
          style={{
            display: 'inline-block',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            padding: '3px 10px',
            borderRadius: 6,
            background: categoryColor + '18',
            color: categoryColor,
          }}
        >
          {categoryLabel}
        </span>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 10, lineHeight: 1.2, marginBottom: 0, paddingRight: 32 }}>
          {displayName}
        </h2>
        {data.country && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: '#64748B', fontSize: 14 }}>
            <MapPin size={14} />
            {data.country}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: '#F1F5F9' }} />

      {/* Info section */}
      <div style={{ padding: 24 }}>
        {/* Certifications */}
        {data.certifications && data.certifications.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <Label>Certifications</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {data.certifications.map((cert: string, i: number) => (
                <span
                  key={i}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 600,
                    background: '#D1FAE5',
                    color: '#065F46',
                  }}
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.contact_email && (
          <InfoRow
            icon={<Mail size={15} />}
            label="Email"
            value={<a href={`mailto:${data.contact_email}`} style={{ color: '#059669', textDecoration: 'none' }} className="hover:underline">{data.contact_email}</a>}
          />
        )}
        {data.contact_phone && (
          <InfoRow icon={<Phone size={15} />} label="Phone" value={data.contact_phone} />
        )}
        {data.website && (
          <InfoRow
            icon={<Globe size={15} />}
            label="Website"
            value={<a href={data.website} target="_blank" rel="noreferrer" style={{ color: '#059669', textDecoration: 'none' }} className="hover:underline">{data.website}</a>}
          />
        )}
        {data.annual_capacity_kg && (
          <InfoRow icon={<FlaskConical size={15} />} label="Annual Capacity" value={`${data.annual_capacity_kg} kg`} />
        )}
        {data.approval_status && (
          <InfoRow icon={<CheckCircle size={15} />} label="Approval Status" value={data.approval_status} />
        )}
        {data.manufacturer && (
          <InfoRow icon={<Factory size={15} />} label="Manufacturer" value={data.manufacturer} />
        )}
        {data.dosage_forms && (
          <InfoRow icon={<Pill size={15} />} label="Dosage Forms" value={data.dosage_forms} />
        )}

        {/* Notes */}
        {data.notes && (
          <div style={{
            marginTop: 16,
            padding: 14,
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
          }}>
            <Label>Notes</Label>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{data.notes}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ padding: '0 24px 24px', borderTop: '1px solid #F1F5F9', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.contact_email && (
          <a
            href={`mailto:${data.contact_email}?subject=Supply%20Inquiry`}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: 13,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              color: '#fff',
              background: '#059669',
              textDecoration: 'none',
              border: 'none',
              transition: 'background 0.15s',
            }}
            className="hover:opacity-90"
          >
            Send Inquiry
          </a>
        )}
        {data.website && (
          <a
            href={data.website}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: 13,
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              color: '#0F172A',
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              textDecoration: 'none',
              transition: 'background 0.15s',
            }}
            className="hover:bg-gray-100"
          >
            Visit Website
          </a>
        )}
        <button
          onClick={() => onSave(displayName, data)}
          style={{
            width: '100%',
            padding: 13,
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 14,
            color: '#059669',
            background: '#fff',
            border: '1px solid #E2E8F0',
            cursor: 'pointer',
            transition: 'background 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          className="hover:bg-gray-50"
        >
          <Bookmark size={15} />
          Save to List
        </button>
      </div>
    </div>
  );
}
