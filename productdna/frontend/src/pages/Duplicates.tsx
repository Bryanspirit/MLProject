import React, { useState } from "react";
import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";
import Icon from "../components/Icon";
import StateMessage from "../components/StateMessage";
import {
  getDuplicates,
  mergeDuplicate,
  separateDuplicate,
  assetUrl,
  Product,
  DuplicateCandidate,
} from "../api/client";
import { useFetch } from "../hooks/useFetch";

/* ----------------------------------------------------------------------------
 * Mapping helpers
 * ------------------------------------------------------------------------- */

interface Attr {
  label: string;
  value: string;
  conflict?: boolean;
}

function subtitle(p: Product): string {
  return [p.brand.value, p.category.value].filter(Boolean).join(" · ") || "—";
}

function matchPct(similarity: number): number {
  return Math.round(similarity <= 1 ? similarity * 100 : similarity);
}

/* ----------------------------------------------------------------------------
 * Building blocks
 * ------------------------------------------------------------------------- */

function ProductSideCard({
  product,
  source,
  attrs,
  showConflict,
}: {
  product: Product;
  source: string;
  attrs: Attr[];
  showConflict?: boolean;
}) {
  return (
    <div className="flex-1 flex gap-4 p-4 rounded-lg bg-surface-container-low border border-transparent group-hover:border-surface-dim transition-colors relative">
      {showConflict && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-tertiary-container bg-tertiary-fixed px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          <Icon name="error" size={14} /> Data Conflict
        </div>
      )}
      <div className="w-24 h-24 rounded bg-surface border border-outline-variant shrink-0 overflow-hidden flex items-center justify-center">
        {product.image_url ? (
          <img
            alt={product.product_name.value ?? "Product"}
            className="w-full h-full object-cover"
            src={assetUrl(product.image_url)}
          />
        ) : (
          <Icon name="image" size={28} className="text-outline" />
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-label-caps text-label-caps text-secondary tracking-wider mb-1">
          Source: {source}
        </span>
        <h3 className="font-h3 text-h3 text-on-surface truncate mb-1">
          {product.product_name.value ?? "Unnamed product"}
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">{subtitle(product)}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-auto">
          {attrs.map((a) => (
            <div className="flex flex-col" key={a.label}>
              <span className="font-data-tabular text-data-tabular text-outline">{a.label}</span>
              <span
                className={
                  a.conflict
                    ? "font-data-tabular text-data-tabular text-tertiary-container bg-tertiary-fixed-dim px-1 rounded -ml-1 inline-block w-max"
                    : "font-data-tabular text-data-tabular text-on-surface"
                }
              >
                {a.value || "—"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DuplicatePairCard({
  pair,
  busy,
  onMerge,
  onSeparate,
}: {
  pair: DuplicateCandidate;
  busy: boolean;
  onMerge: () => void;
  onSeparate: () => void;
}) {
  const { product_a: a, product_b: b } = pair;
  const barcodeConflict = a.barcode.value !== b.barcode.value;
  const categoryConflict = a.category.value !== b.category.value;
  const anyConflict = barcodeConflict || categoryConflict;

  const attrsA: Attr[] = [
    { label: "UPC", value: a.barcode.value ?? "" },
    { label: "Category", value: a.category.value ?? "" },
  ];
  const attrsB: Attr[] = [
    { label: "UPC", value: b.barcode.value ?? "", conflict: barcodeConflict },
    { label: "Category", value: b.category.value ?? "", conflict: categoryConflict },
  ];

  return (
    <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-col lg:flex-row items-stretch gap-6 hover:border-outline transition-colors group">
      <ProductSideCard product={a} source={a.brand.source || "ERP"} attrs={attrsA} />

      {/* Center action & score panel */}
      <div className="lg:w-48 shrink-0 flex flex-col items-center justify-center gap-5 lg:border-x border-outline-variant/30 px-2">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 bg-primary-container text-on-primary-container px-3 py-1.5 rounded-full border border-primary/20 shadow-sm">
            <Icon name="check_circle" size={16} />
            <span className="font-label-caps text-label-caps font-bold">
              {matchPct(pair.similarity)}% Match
            </span>
          </div>
          <span className="font-data-tabular text-data-tabular text-on-surface-variant">
            System Confidence
          </span>
        </div>
        <div className="flex flex-col gap-2 w-full px-4">
          <button
            onClick={onMerge}
            disabled={busy}
            className="w-full bg-primary text-on-primary font-body-sm text-body-sm py-2 rounded shadow-sm hover:bg-surface-tint transition-colors text-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? "Working…" : "Merge Records"}
          </button>
          <button
            onClick={onSeparate}
            disabled={busy}
            className="w-full bg-transparent border border-outline-variant text-on-surface font-body-sm text-body-sm py-2 rounded hover:bg-surface-container transition-colors text-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Keep Separate
          </button>
        </div>
      </div>

      <ProductSideCard
        product={b}
        source={b.brand.source || "Vendor Feed"}
        attrs={attrsB}
        showConflict={anyConflict}
      />
    </article>
  );
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const Duplicates: React.FC = () => {
  const { data, loading, error, reload } = useFetch(getDuplicates);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pairs = data ?? [];

  async function act(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    setActionError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-background text-on-background font-body-base text-body-base antialiased flex min-h-screen">
      <SideNavBar active="Duplicates" />
      <div className="flex-1 md:ml-60 flex flex-col min-w-0">
        <TopAppBar />
        <main className="flex-1 overflow-y-auto p-section-margin bg-background">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-h1 text-h1 text-on-surface mb-2">Duplicates Queue</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Review candidate pairs identified by the matching engine. Resolve to maintain
                master data integrity.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="font-data-tabular text-data-tabular text-on-surface-variant bg-surface-container px-3 py-1.5 rounded border border-outline-variant">
                {loading ? "…" : `${pairs.length} Pending Tasks`}
              </span>
              <button className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface font-body-sm text-body-sm px-4 py-2 rounded shadow-sm hover:bg-surface-container transition-colors">
                <Icon name="filter_list" size={18} />
                Filter
              </button>
            </div>
          </div>

          {actionError && (
            <p className="font-body-sm text-body-sm text-error mb-4">{actionError}</p>
          )}

          {loading ? (
            <StateMessage variant="loading" />
          ) : error ? (
            <StateMessage
              variant="error"
              message={`${error}. Is the backend running on localhost:8000?`}
              onRetry={reload}
            />
          ) : pairs.length === 0 ? (
            <StateMessage
              variant="empty"
              title="No duplicates pending"
              message="The matching engine hasn’t flagged any candidate pairs for review."
            />
          ) : (
            <div className="flex flex-col gap-4">
              {pairs.map((pair) => (
                <DuplicatePairCard
                  key={pair.id}
                  pair={pair}
                  busy={busyId === pair.id}
                  onMerge={() => act(pair.id, () => mergeDuplicate(pair.id))}
                  onSeparate={() => act(pair.id, () => separateDuplicate(pair.id))}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Duplicates;
