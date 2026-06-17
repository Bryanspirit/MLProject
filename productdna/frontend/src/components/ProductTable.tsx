import React from "react";
import { Product, assetUrl, overallConfidence, statusLabel } from "../api/client";
import ConfidenceBadge from "./ConfidenceBadge";
import StateMessage from "./StateMessage";
import Icon from "./Icon";

interface Props {
  products: Product[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
}

function StatusCell({ status }: { status: string }) {
  const dot =
    status === "approved"
      ? "bg-tertiary"
      : status === "needs_review"
      ? "bg-primary"
      : status === "failed"
      ? "bg-error"
      : "bg-outline";
  return (
    <span className="inline-flex items-center gap-1.5 text-on-surface-variant">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {statusLabel(status)}
    </span>
  );
}

/** Sortable-looking products grid with thumbnail, key attributes, confidence,
 *  status, and a Review link. Presentational — data is fetched by the caller. */
export default function ProductTable({ products, loading, error, onRetry, emptyMessage }: Props) {
  if (loading) return <StateMessage variant="loading" />;
  if (error) return <StateMessage variant="error" message={error} onRetry={onRetry} />;
  if (products.length === 0)
    return (
      <StateMessage
        variant="empty"
        message={emptyMessage ?? "No products match these filters yet."}
      />
    );

  return (
    <div className="overflow-x-auto border border-outline-variant rounded-lg bg-surface-container-lowest shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-surface-container-low font-label-caps text-label-caps text-on-surface-variant uppercase border-b border-outline-variant">
          <tr>
            <th className="px-cell-padding-h py-cell-padding-v font-semibold w-16">Item</th>
            <th className="px-cell-padding-h py-cell-padding-v font-semibold">Product</th>
            <th className="px-cell-padding-h py-cell-padding-v font-semibold hidden md:table-cell">Brand</th>
            <th className="px-cell-padding-h py-cell-padding-v font-semibold hidden lg:table-cell">Category</th>
            <th className="px-cell-padding-h py-cell-padding-v font-semibold">Confidence</th>
            <th className="px-cell-padding-h py-cell-padding-v font-semibold">Status</th>
            <th className="px-cell-padding-h py-cell-padding-v font-semibold text-right">Action</th>
          </tr>
        </thead>
        <tbody className="font-data-tabular text-data-tabular text-on-surface divide-y divide-outline-variant">
          {products.map((p) => (
            <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
              <td className="px-cell-padding-h py-2">
                <div className="w-9 h-9 rounded bg-surface-variant border border-outline-variant overflow-hidden flex items-center justify-center">
                  {p.image_url ? (
                    <img
                      alt={p.product_name.value ?? "Product"}
                      className="w-full h-full object-cover"
                      src={assetUrl(p.image_url)}
                    />
                  ) : (
                    <Icon name="image" size={18} className="text-outline" />
                  )}
                </div>
              </td>
              <td className="px-cell-padding-h py-2 font-medium max-w-[220px] truncate">
                {p.product_name.value ?? "—"}
              </td>
              <td className="px-cell-padding-h py-2 text-on-surface-variant hidden md:table-cell">
                {p.brand.value ?? "—"}
              </td>
              <td className="px-cell-padding-h py-2 text-on-surface-variant hidden lg:table-cell">
                {p.category.value ?? "—"}
              </td>
              <td className="px-cell-padding-h py-2">
                <ConfidenceBadge confidence={overallConfidence(p)} showValue />
              </td>
              <td className="px-cell-padding-h py-2">
                <StatusCell status={p.status} />
              </td>
              <td className="px-cell-padding-h py-2 text-right">
                <a
                  href={`#/products/${p.id}`}
                  className="inline-flex items-center gap-1 font-body-sm text-body-sm text-primary hover:text-surface-tint font-medium transition-colors"
                >
                  Review
                  <Icon name="chevron_right" size={16} />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
