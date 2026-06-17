import React, { useEffect, useMemo, useState } from "react";
import {
  Product,
  ProductDuplicate,
  assetUrl,
  updateProduct,
  approveProduct,
  getProductDuplicates,
  overallConfidence,
  statusLabel,
} from "../api/client";
import ConfidenceBadge from "./ConfidenceBadge";
import Icon from "./Icon";

type FieldKey =
  | "product_name"
  | "brand"
  | "manufacturer"
  | "category"
  | "segment"
  | "barcode"
  | "weight"
  | "packaging"
  | "country_of_origin"
  | "marketing_message";

const FIELDS: { key: FieldKey; label: string; multiline?: boolean }[] = [
  { key: "product_name", label: "Product Name" },
  { key: "brand", label: "Brand" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "category", label: "Category" },
  { key: "segment", label: "Segment" },
  { key: "barcode", label: "Barcode" },
  { key: "weight", label: "Weight" },
  { key: "packaging", label: "Packaging" },
  { key: "country_of_origin", label: "Country of Origin" },
  { key: "marketing_message", label: "Marketing Message", multiline: true },
];

interface Props {
  product: Product;
  /** Called with the refreshed product after a successful save/approve. */
  onChange?: (updated: Product) => void;
  /** Optional success / error hooks (wired to toasts by callers). */
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

/** Editable review of one product's extracted attributes. Manual edits are
 *  persisted as source="manual" at 100% confidence; Approve also flips status. */
export default function ProductReviewPanel({ product, onChange, onSuccess, onError }: Props) {
  const initial = useMemo(
    () =>
      Object.fromEntries(FIELDS.map((f) => [f.key, product[f.key].value ?? ""])) as Record<
        FieldKey,
        string
      >,
    [product]
  );
  const [edits, setEdits] = useState<Record<FieldKey, string>>(initial);
  const [busy, setBusy] = useState<null | "save" | "approve">(null);
  const [error, setError] = useState<string | null>(null);
  const [dupes, setDupes] = useState<ProductDuplicate[]>([]);

  // Surface any pending duplicate candidates for this product inline, so the
  // reviewer is warned before approving a likely duplicate.
  useEffect(() => {
    let alive = true;
    getProductDuplicates(product.id)
      .then((d) => alive && setDupes(d))
      .catch(() => alive && setDupes([]));
    return () => {
      alive = false;
    };
  }, [product.id]);

  const dirty = FIELDS.filter((f) => (edits[f.key] ?? "") !== (product[f.key].value ?? ""));
  const isDirty = dirty.length > 0;
  const isApproved = product.status === "approved";

  const set = (key: FieldKey, v: string) => setEdits((p) => ({ ...p, [key]: v }));

  const changedPayload = () =>
    Object.fromEntries(dirty.map((f) => [f.key, edits[f.key].trim() || null]));

  async function run(kind: "save" | "approve") {
    setBusy(kind);
    setError(null);
    try {
      const updated =
        kind === "approve"
          ? await approveProduct(product.id, isDirty ? changedPayload() : undefined)
          : await updateProduct(product.id, { fields: changedPayload() });
      onChange?.(updated);
      onSuccess?.(kind === "approve" ? "Product approved" : "Changes saved");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      setError(msg);
      onError?.(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header: image + summary */}
      <div className="flex items-center gap-4">
        {product.image_url && (
          <div
            className="w-16 h-16 rounded-lg border border-outline-variant/40 bg-surface-variant bg-cover bg-center flex-shrink-0"
            style={{ backgroundImage: `url('${assetUrl(product.image_url)}')` }}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-data-tabular text-data-tabular text-on-surface truncate">
            {product.product_name.value || "Untitled product"}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <ConfidenceBadge confidence={overallConfidence(product)} showValue />
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              {statusLabel(product.status)}
            </span>
          </div>
        </div>
      </div>

      {/* Possible-duplicate warning */}
      {dupes.length > 0 && (
        <div className="rounded-lg border border-tertiary/40 bg-tertiary-container/20 px-3 py-2">
          <p className="font-label-caps text-label-caps text-tertiary flex items-center gap-1.5">
            <Icon name="content_copy" size={14} />
            {dupes.length} possible duplicate{dupes.length > 1 ? "s" : ""}
          </p>
          <ul className="mt-1 space-y-0.5">
            {dupes.map((d) => (
              <li
                key={d.candidate_id}
                className="text-on-surface-variant text-[12px] truncate"
                title={d.other.product_name.value || d.other.id}
              >
                {d.other.product_name.value || d.other.brand.value || "Untitled product"}
                {" · "}
                {Math.round(d.similarity * 100)}% match
              </li>
            ))}
          </ul>
          <p className="text-on-surface-variant text-[11px] mt-1">
            Resolve on the Duplicates page before approving.
          </p>
        </div>
      )}

      {/* Editable fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {FIELDS.map((f) => {
          const fv = product[f.key];
          const changed = (edits[f.key] ?? "") !== (fv.value ?? "");
          return (
            <div
              key={f.key}
              className={f.multiline ? "sm:col-span-2" : ""}
            >
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor={`fld-${product.id}-${f.key}`}
                  className="font-label-caps text-label-caps text-on-surface-variant"
                >
                  {f.label}
                </label>
                <span className="flex items-center gap-1.5">
                  {changed && (
                    <span className="font-label-caps text-label-caps text-primary">edited</span>
                  )}
                  <ConfidenceBadge level={fv.confidence_level} confidence={fv.confidence} />
                </span>
              </div>
              {f.multiline ? (
                <textarea
                  id={`fld-${product.id}-${f.key}`}
                  value={edits[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  rows={2}
                  className="w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              ) : (
                <input
                  id={`fld-${product.id}-${f.key}`}
                  value={edits[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder="—"
                  className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body-sm text-body-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                />
              )}
              {fv.reasoning && (
                <p className="text-on-surface-variant text-[11px] mt-1 truncate" title={fv.reasoning}>
                  {fv.source} · {fv.reasoning}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="font-body-sm text-body-sm text-error flex items-center gap-1.5">
          <Icon name="error" size={16} /> {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-1">
        <button
          onClick={() => run("save")}
          disabled={!isDirty || busy !== null}
          className="font-body-sm text-body-sm text-on-surface border border-outline-variant rounded-lg px-4 py-2 hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <Icon name="save" size={16} className={busy === "save" ? "animate-spin" : ""} />
          {busy === "save" ? "Saving…" : "Save changes"}
        </button>
        <button
          onClick={() => run("approve")}
          disabled={busy !== null || (isApproved && !isDirty)}
          className="font-body-sm text-body-sm text-on-primary bg-primary border border-primary rounded-lg px-4 py-2 hover:bg-surface-tint transition-colors shadow-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
        >
          <Icon
            name={busy === "approve" ? "sync" : "check_circle"}
            size={16}
            className={busy === "approve" ? "animate-spin" : ""}
          />
          {isApproved ? (isDirty ? "Save & re-approve" : "Approved") : "Approve"}
        </button>
      </div>
    </div>
  );
}
