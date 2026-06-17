import React, { useEffect, useRef, useState } from "react";
import SideNavBar from "../components/SideNavBar";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import StateMessage from "../components/StateMessage";
import ProductReviewPanel from "../components/ProductReviewPanel";
import {
  uploadImage,
  uploadBatch,
  getProduct,
  retryExtraction,
  productEventsUrl,
  assetUrl,
  Product,
} from "../api/client";
import { useToast } from "../hooks/useToast";

/* ----------------------------------------------------------------------------
 * Files-in-flight model
 * ------------------------------------------------------------------------- */

type FlightStatus = "uploading" | "extracting" | "complete" | "error";

interface FlightItem {
  key: string;
  name: string;
  productId?: string;
  status: FlightStatus;
  thumb?: string;
  detail: string;
  progress?: number; // real pipeline progress (0-100) while extracting
}

// Maps a backend pipeline stage to a human label and an approximate progress %.
const STAGE_INFO: Record<string, { label: string; pct: number }> = {
  queued: { label: "Queued…", pct: 8 },
  vision: { label: "Reading the pack (vision)…", pct: 30 },
  ocr: { label: "Extracting text (OCR)…", pct: 55 },
  barcode: { label: "Scanning barcode…", pct: 70 },
  lookup: { label: "Looking up barcode…", pct: 85 },
  consolidating: { label: "Consolidating angles…", pct: 92 },
};

function stageInfo(stage?: string | null): { label: string; pct: number } {
  return (stage && STAGE_INFO[stage]) || { label: "Extracting attributes…", pct: 65 };
}

const statusConfig: Record<
  FlightStatus,
  { label: string; icon: string; iconSpin?: boolean; badge: string; bar: string; progress: number }
> = {
  uploading: {
    label: "Uploading",
    icon: "sync",
    iconSpin: true,
    badge: "text-primary bg-primary-container/20 border-primary/20",
    bar: "bg-primary",
    progress: 20,
  },
  extracting: {
    label: "Extracting",
    icon: "sync",
    iconSpin: true,
    badge: "text-primary bg-primary-container/20 border-primary/20",
    bar: "bg-primary",
    progress: 65,
  },
  complete: {
    label: "Complete",
    icon: "check_circle",
    badge: "text-tertiary bg-tertiary-container/20 border-tertiary/20",
    bar: "bg-tertiary",
    progress: 100,
  },
  error: {
    label: "Failed",
    icon: "error",
    badge: "text-error bg-error-container/40 border-error/20",
    bar: "bg-error",
    progress: 100,
  },
};

let counter = 0;
const nextKey = () => `f${Date.now()}_${counter++}`;

/* ----------------------------------------------------------------------------
 * Client-side validation
 *
 * The dropzone's `accept` attribute only filters the browse dialog — drag-and-
 * dropped files bypass it entirely. Validate here so unsupported or oversized
 * files get a clear, per-file reason instead of a generic backend 400.
 * Keep this in sync with the backend ALLOWED_TYPES (app/api/upload.py).
 * ------------------------------------------------------------------------- */

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Returns a human-readable reason if the file is invalid, or null if it's fine.
function validateFile(file: File): string | null {
  // Browsers sometimes leave file.type blank; fall back to the extension.
  const typeOk = file.type
    ? ACCEPTED_TYPES.includes(file.type)
    : ACCEPTED_EXTS.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!typeOk) return "Unsupported format — use JPEG, PNG, or WebP.";
  if (file.size === 0) return "File is empty.";
  if (file.size > MAX_FILE_BYTES)
    return `Too large (${formatBytes(file.size)}). Max ${formatBytes(MAX_FILE_BYTES)}.`;
  return null;
}

/* ----------------------------------------------------------------------------
 * Row
 * ------------------------------------------------------------------------- */

function FileIconCell({ item }: { item: FlightItem }) {
  if (item.status === "complete" && item.thumb) {
    return (
      <div
        className="w-10 h-10 rounded bg-surface-variant flex-shrink-0 border border-outline-variant/30 overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url('${item.thumb}')` }}
      />
    );
  }
  const inFlight = item.status === "uploading" || item.status === "extracting";
  return (
    <div
      className={`w-10 h-10 rounded bg-surface-variant flex-shrink-0 flex items-center justify-center relative overflow-hidden ${
        inFlight ? "border border-primary/30" : "border border-outline-variant/30"
      }`}
    >
      {inFlight && <div className="absolute inset-0 bg-primary/10 animate-pulse" />}
      <Icon
        name={item.status === "error" ? "error" : "description"}
        size={20}
        className={`relative z-10 ${item.status === "error" ? "text-error" : inFlight ? "text-primary" : "text-outline"}`}
      />
    </div>
  );
}

function FileRow({
  item,
  last,
  expanded,
  onReview,
  onRetry,
}: {
  item: FlightItem;
  last: boolean;
  expanded: boolean;
  onReview: (item: FlightItem) => void;
  onRetry: (item: FlightItem) => void;
}) {
  const cfg = statusConfig[item.status];
  const isComplete = item.status === "complete";
  const inFlight = item.status === "uploading" || item.status === "extracting";
  const canRetry = item.status === "error" && !!item.productId;
  // Use the real pipeline progress while extracting; fall back to the coarse
  // per-status default otherwise.
  const barPct = inFlight && item.progress != null ? item.progress : cfg.progress;

  return (
    <div
      className={`flex items-center gap-data-gap p-cell-padding-h transition-colors min-h-[48px] ${
        last ? "" : "border-b border-outline-variant"
      } ${inFlight ? "bg-surface-container-low" : "hover:bg-surface-container-low"}`}
    >
      <FileIconCell item={item} />

      <div className="flex-1 min-w-0 pr-4">
        <p className="font-data-tabular text-data-tabular text-on-surface truncate">{item.name}</p>
        <p className="text-on-surface-variant truncate text-[11px] mt-0.5">{item.detail}</p>
      </div>

      <div className="flex-shrink-0 w-32 hidden sm:block">
        <div className="w-full bg-surface-variant h-1.5 rounded-full overflow-hidden">
          <div
            className={`${cfg.bar} h-full transition-all duration-1000 ease-out`}
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>

      <div className="flex-shrink-0 w-28 text-right">
        <span
          className={`inline-flex items-center gap-1 font-label-caps text-label-caps px-2 py-1 rounded border ${cfg.badge}`}
        >
          <Icon name={cfg.icon} size={14} className={cfg.iconSpin ? "animate-spin" : ""} />
          {cfg.label}
        </span>
      </div>

      <div className="flex-shrink-0 w-24 text-right">
        {isComplete && item.productId ? (
          <button
            onClick={() => onReview(item)}
            aria-expanded={expanded}
            className={`inline-flex items-center gap-1 font-body-sm text-body-sm rounded px-3 py-1.5 transition-colors shadow-sm font-medium border ${
              expanded
                ? "text-on-surface bg-surface-container-high border-outline-variant"
                : "text-on-primary bg-primary border-primary hover:bg-surface-tint"
            }`}
          >
            {expanded ? "Close" : "Review"}
            <Icon name={expanded ? "expand_less" : "expand_more"} size={16} />
          </button>
        ) : canRetry ? (
          <button
            onClick={() => onRetry(item)}
            className="inline-flex items-center gap-1 font-body-sm text-body-sm rounded px-3 py-1.5 transition-colors shadow-sm font-medium border text-on-surface bg-surface-container-high border-outline-variant hover:bg-surface-container-highest"
          >
            <Icon name="refresh" size={16} />
            Retry
          </button>
        ) : (
          <button
            disabled
            className="font-body-sm text-body-sm text-outline border border-outline-variant/50 rounded px-3 py-1.5 cursor-not-allowed opacity-50 bg-surface-container-highest"
          >
            Review
          </button>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const Upload: React.FC = () => {
  const [items, setItems] = useState<FlightItem[]>([]);
  const [mergeMode, setMergeMode] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [productCache, setProductCache] = useState<Record<string, Product>>({});
  const [reviewError, setReviewError] = useState<Record<string, string>>({});
  const timers = useRef<number[]>([]);
  const streams = useRef<EventSource[]>([]);
  const toast = useToast();

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      streams.current.forEach((es) => es.close());
    };
  }, []);

  const update = (key: string, patch: Partial<FlightItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  // Subscribe to the backend SSE stream for live, stage-accurate progress
  // (vision → ocr → barcode → lookup) instead of polling a fake bar.
  function openStream(key: string, productId: string) {
    let es: EventSource;
    try {
      es = new EventSource(productEventsUrl(productId));
    } catch {
      update(key, { status: "error", detail: "Could not open progress stream." });
      return;
    }
    streams.current.push(es);

    es.onmessage = async (e) => {
      let data: { status?: string; stage?: string | null; error?: string };
      try {
        data = JSON.parse(e.data);
      } catch {
        return;
      }
      if (data.error === "not_found") {
        update(key, { status: "error", detail: "Product not found." });
        es.close();
        return;
      }
      if (data.status === "failed") {
        update(key, {
          status: "error",
          detail: "Extraction failed. Check the backend logs.",
        });
        es.close();
      } else if (data.status === "approved" || data.status === "needs_review") {
        es.close();
        let thumb: string | undefined;
        try {
          const p = await getProduct(productId);
          thumb = p.image_url ? assetUrl(p.image_url) : undefined;
        } catch {
          /* thumb is optional */
        }
        update(key, {
          status: "complete",
          detail: data.status === "approved" ? "Auto-approved" : "Ready for stewardship",
          progress: 100,
          thumb,
        });
      } else {
        const { label, pct } = stageInfo(data.stage);
        update(key, { status: "extracting", detail: label, progress: pct });
      }
    };

    // Transient drops: EventSource auto-reconnects. We explicitly close on a
    // terminal status above, so this never loops indefinitely.
    es.onerror = () => {
      /* allow built-in reconnect */
    };
  }

  // Merge mode: send the whole selection as one batch -> one consolidated record.
  async function handleBatch(files: File[]) {
    const key = nextKey();
    const label =
      files.length > 1 ? `${files.length} images → 1 product` : files[0].name;
    setItems((prev) => [
      { key, name: label, status: "uploading", detail: "Uploading set…" },
      ...prev,
    ]);
    try {
      const res = await uploadBatch(files);
      update(key, {
        productId: res.product_id,
        status: "extracting",
        detail: `Merging ${res.image_count} image${res.image_count > 1 ? "s" : ""}…`,
      });
      openStream(key, res.product_id);
    } catch (e) {
      update(key, {
        status: "error",
        detail: e instanceof Error ? e.message : "Upload failed.",
      });
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    // Validate up front: rejected files get an error row and never hit the API.
    const valid: File[] = [];
    const rejected: { file: File; reason: string }[] = [];
    for (const file of files) {
      const reason = validateFile(file);
      if (reason) rejected.push({ file, reason });
      else valid.push(file);
    }

    if (rejected.length > 0) {
      setItems((prev) => [
        ...rejected.map(({ file, reason }) => ({
          key: nextKey(),
          name: file.name,
          status: "error" as FlightStatus,
          detail: reason,
        })),
        ...prev,
      ]);
    }

    if (valid.length === 0) return;

    if (mergeMode) {
      await handleBatch(valid);
      return;
    }

    for (const file of valid) {
      const key = nextKey();
      setItems((prev) => [
        { key, name: file.name, status: "uploading", detail: "Uploading…" },
        ...prev,
      ]);
      try {
        const res = await uploadImage(file);
        update(key, {
          productId: res.product_id,
          status: "extracting",
          detail: "Extracting attributes…",
        });
        openStream(key, res.product_id);
      } catch (e) {
        update(key, {
          status: "error",
          detail: e instanceof Error ? e.message : "Upload failed.",
        });
      }
    }
  }

  // Re-run a failed extraction without re-uploading, then resume polling.
  async function handleRetry(item: FlightItem) {
    if (!item.productId) return;
    update(item.key, { status: "extracting", detail: "Retrying extraction…" });
    try {
      await retryExtraction(item.productId);
      openStream(item.key, item.productId);
    } catch (e) {
      update(item.key, {
        status: "error",
        detail: e instanceof Error ? e.message : "Retry failed.",
      });
    }
  }

  // Toggle the inline review panel for a completed item, fetching the full
  // product the first time it's opened.
  async function handleReview(item: FlightItem) {
    if (!item.productId) return;
    if (expandedKey === item.key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(item.key);
    if (!productCache[item.productId]) {
      try {
        const p = await getProduct(item.productId);
        setProductCache((c) => ({ ...c, [p.id]: p }));
      } catch (e) {
        setReviewError((m) => ({
          ...m,
          [item.key]: e instanceof Error ? e.message : "Failed to load product.",
        }));
      }
    }
  }

  // Reflect a save/approve back into the row + cache.
  function handleReviewed(item: FlightItem, updated: Product) {
    setProductCache((c) => ({ ...c, [updated.id]: updated }));
    update(item.key, {
      detail: updated.status === "approved" ? "Approved — ready for export" : "Changes saved",
    });
  }

  function renderReview(item: FlightItem) {
    const err = reviewError[item.key];
    if (err) return <StateMessage variant="error" message={err} />;
    const p = item.productId ? productCache[item.productId] : undefined;
    if (!p)
      return <StateMessage variant="loading" message="Loading extracted attributes…" />;
    return (
      <ProductReviewPanel
        product={p}
        onChange={(u) => handleReviewed(item, u)}
        onSuccess={toast.success}
        onError={toast.error}
      />
    );
  }

  const activeCount = items.filter(
    (i) => i.status === "uploading" || i.status === "extracting"
  ).length;

  return (
    <div className="bg-background text-on-background font-body-base text-body-base flex min-h-screen">
      <SideNavBar active="Upload" />
      <div className="flex-1 md:ml-60 flex flex-col min-w-0 bg-background">
        <PageHeader title="Data Ingestion" />

        <main className="flex-1 overflow-y-auto p-section-margin">
          <div className="max-w-4xl mx-auto space-y-section-margin">
            <div>
              <h2 className="font-h1 text-h1 text-on-surface mb-2">Upload Assets</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Securely ingest raw product images. The system will automatically extract and
                categorize recognized file types. Supported image formats: JPEG, PNG, WebP.
              </p>
            </div>

            {/* Merge toggle */}
            <label className="flex items-start gap-3 bg-surface-container-low border border-outline-variant rounded-lg p-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={mergeMode}
                onChange={(e) => setMergeMode(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary cursor-pointer"
              />
              <div>
                <p className="font-body-sm text-body-sm text-on-surface font-medium">
                  Merge into one product
                </p>
                <p className="text-on-surface-variant text-[12px] mt-0.5">
                  Treat the selected images as multiple angles of the <em>same</em> item. They’re
                  extracted together and consolidated into a single record, keeping the
                  highest-confidence value for each attribute.
                </p>
              </div>
            </label>

            {/* Dropzone */}
            <div
              className="relative group"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFiles(e.dataTransfer.files);
              }}
            >
              <div className="border-2 border-dashed border-outline-variant rounded-xl bg-surface-container-lowest p-16 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 hover:border-primary hover:bg-surface-container-low focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                <div className="w-16 h-16 mb-4 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary-container/20 transition-colors">
                  <Icon
                    name="cloud_upload"
                    size={32}
                    className="text-outline group-hover:text-primary transition-colors"
                  />
                </div>
                <h3 className="font-h2 text-h2 text-on-surface mb-2 group-hover:text-primary transition-colors">
                  Drop product images here
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
                  Drag and drop your files directly into this area, or{" "}
                  <span className="text-primary font-medium">browse your computer</span>. Supported
                  formats: .jpg, .png, .webp — up to {formatBytes(MAX_FILE_BYTES)} each.
                </p>
                <input
                  aria-label="File upload input"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  multiple
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {/* Files in flight */}
            {items.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-h3 text-h3 text-on-surface">Files in flight</h3>
                  <span className="font-label-caps text-label-caps bg-surface-variant text-on-surface-variant px-2 py-1 rounded">
                    {activeCount} ACTIVE
                  </span>
                </div>

                <div className="border border-outline-variant rounded-lg bg-surface-container-lowest overflow-hidden shadow-sm">
                  {items.map((item, idx) => {
                    const isExpanded = expandedKey === item.key;
                    const isLast = idx === items.length - 1;
                    return (
                      <React.Fragment key={item.key}>
                        <FileRow
                          item={item}
                          last={isLast && !isExpanded}
                          expanded={isExpanded}
                          onReview={handleReview}
                          onRetry={handleRetry}
                        />
                        {isExpanded && (
                          <div
                            className={`bg-surface-container-low p-5 ${
                              isLast ? "" : "border-b border-outline-variant"
                            }`}
                          >
                            {renderReview(item)}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Upload;