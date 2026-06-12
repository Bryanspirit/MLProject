import React from 'react';
import { Product, assetUrl, overallConfidence, statusLabel } from '../api/client';
import StateMessage from './StateMessage';

interface Props {
  extractions: Product[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ConfidenceBadge({ value }: { value: number }) {
  const cls =
    value >= 85
      ? 'bg-[#E8F5E9] text-[#2E7D32]'
      : value >= 60
      ? 'bg-[#FFF3E0] text-[#E65100]'
      : 'bg-error-container text-on-error-container';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${cls}`}>
      {value}%
    </span>
  );
}

function StatusCell({ status }: { status: string }) {
  const isReview = status === 'needs_review';
  const isExtracting = status === 'extracting';
  const dot = isReview ? 'bg-tertiary-container' : isExtracting ? 'bg-outline' : 'bg-[#2E7D32]';
  const text = isReview ? 'text-tertiary-container' : 'text-on-surface-variant';
  return (
    <span className={`inline-flex items-center gap-1 ${text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`}></span>
      {statusLabel(status)}
    </span>
  );
}

const RecentExtractionsTable: React.FC<Props> = ({ extractions, loading, error, onRetry }) => {
  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-lg flex flex-col overflow-hidden">
      <div className="p-5 border-b border-outline-variant flex justify-between items-center">
        <h2 className="font-h3 text-h3 text-on-surface">Recent Extractions</h2>
        <button className="font-body-sm text-body-sm text-primary hover:text-surface-tint font-medium transition-colors">View All</button>
      </div>

      {loading ? (
        <StateMessage variant="loading" />
      ) : error ? (
        <StateMessage variant="error" message={error} onRetry={onRetry} />
      ) : extractions.length === 0 ? (
        <StateMessage variant="empty" message="Uploaded products will appear here once extracted." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low font-label-caps text-label-caps text-on-surface-variant uppercase border-b border-outline-variant">
              <tr>
                <th className="px-cell-padding-h py-cell-padding-v font-semibold w-16">Item</th>
                <th className="px-cell-padding-h py-cell-padding-v font-semibold">Brand</th>
                <th className="px-cell-padding-h py-cell-padding-v font-semibold">Product Name</th>
                <th className="px-cell-padding-h py-cell-padding-v font-semibold">Confidence</th>
                <th className="px-cell-padding-h py-cell-padding-v font-semibold">Status</th>
                <th className="px-cell-padding-h py-cell-padding-v font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="font-data-tabular text-data-tabular text-on-surface divide-y divide-outline-variant">
              {extractions.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container-low transition-colors h-8">
                  <td className="px-cell-padding-h py-1">
                    <div className="w-8 h-8 rounded bg-surface-variant border border-outline-variant overflow-hidden flex items-center justify-center">
                      {p.image_url ? (
                        <img alt={p.product_name.value ?? 'Product'} className="w-full h-full object-cover" src={assetUrl(p.image_url)} />
                      ) : (
                        <span className="material-symbols-outlined text-outline" style={{ fontSize: 18 }}>image</span>
                      )}
                    </div>
                  </td>
                  <td className="px-cell-padding-h py-1 text-on-surface-variant">{p.brand.value ?? '—'}</td>
                  <td className="px-cell-padding-h py-1 font-medium">{p.product_name.value ?? '—'}</td>
                  <td className="px-cell-padding-h py-1"><ConfidenceBadge value={overallConfidence(p)} /></td>
                  <td className="px-cell-padding-h py-1"><StatusCell status={p.status} /></td>
                  <td className="px-cell-padding-h py-1 text-right text-on-surface-variant">{formatTime(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default RecentExtractionsTable;
