import React, { useEffect, useRef, useState } from "react";
import SideNavBar from "../components/SideNavBar";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";
import { uploadImage, getProduct, assetUrl } from "../api/client";

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

function FileRow({ item, last }: { item: FlightItem; last: boolean }) {
  const cfg = statusConfig[item.status];
  const isComplete = item.status === "complete";
  const inFlight = item.status === "uploading" || item.status === "extracting";

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
            style={{ width: `${cfg.progress}%` }}
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
          <a
            href={`#/products/${item.productId}`}
            className="inline-block font-body-sm text-body-sm text-on-primary bg-primary border border-primary rounded px-3 py-1.5 hover:bg-surface-tint transition-colors shadow-sm font-medium"
          >
            Review
          </a>
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
  const timers = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const update = (key: string, patch: Partial<FlightItem>) =>
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  // Poll for up to ~5 min: CPU vision extraction can take minutes per image.
  function pollStatus(key: string, productId: string, attempt = 0) {
    if (attempt > 100) {
      update(key, {
        status: "error",
        detail: "Timed out. Is the model backend (Ollama) running?",
      });
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const p = await getProduct(productId);
        if (p.status === "extracting") {
          update(key, { status: "extracting", detail: "Extracting attributes…" });
          pollStatus(key, productId, attempt + 1);
        } else {
          update(key, {
            status: "complete",
            detail: "Ready for stewardship",
            thumb: p.image_url ? assetUrl(p.image_url) : undefined,
          });
        }
      } catch (e) {
        update(key, {
          status: "error",
          detail: e instanceof Error ? e.message : "Status check failed.",
        });
      }
    }, 2000);
    timers.current.push(t);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
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
        pollStatus(key, res.product_id);
      } catch (e) {
        update(key, {
          status: "error",
          detail: e instanceof Error ? e.message : "Upload failed.",
        });
      }
    }
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
                  formats: .jpg, .png, .webp.
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
                  {items.map((item, idx) => (
                    <FileRow key={item.key} item={item} last={idx === items.length - 1} />
                  ))}
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