import React, { useEffect, useState } from "react";
import SideNavBar from "../components/SideNavBar";
import Icon from "../components/Icon";
import StateMessage from "../components/StateMessage";
import {
  getProducts,
  assetUrl,
  overallConfidence,
  statusLabel,
  Product,
  FieldValue,
} from "../api/client";
import { useFetch } from "../hooks/useFetch";

/* ----------------------------------------------------------------------------
 * Small building blocks
 * ------------------------------------------------------------------------- */

function Tooltip({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="relative group/tip cursor-help">
      <Icon
        name="info"
        size={16}
        className="text-outline-variant hover:text-primary transition-colors"
      />
      <div className="invisible opacity-0 group-hover/tip:visible group-hover/tip:opacity-100 transition-opacity absolute bottom-full right-0 mb-2 w-48 bg-inverse-surface text-inverse-on-surface text-[11px] leading-snug p-2 rounded shadow-lg z-10 border border-outline/20">
        {text}
      </div>
    </div>
  );
}

const inputClasses =
  "w-full bg-surface text-on-surface font-body-sm px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow";

function Field({ label, field }: { label: string; field: FieldValue }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="font-label-caps text-label-caps text-on-surface-variant">{label}</label>
        <div className="flex items-center gap-2">
          <span className="bg-primary-container/20 text-primary-container font-data-tabular px-1.5 py-0.5 rounded text-[10px]">
            {Math.round(field.confidence)}%
          </span>
          <Tooltip text={field.reasoning} />
        </div>
      </div>
      <input className={inputClasses} type="text" defaultValue={field.value ?? ""} />
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Agent telemetry timeline (illustrative — no trace endpoint is wired yet)
 * ------------------------------------------------------------------------- */

interface Step {
  icon: string;
  name: string;
  duration: string;
  code: string;
  result?: boolean;
  active?: boolean;
}

const steps: Step[] = [
  {
    icon: "visibility",
    name: "vision_describe",
    duration: "450ms",
    code: 'args: {\n  "focus": "labels"\n}',
  },
  {
    icon: "text_fields",
    name: "extract_text_ocr",
    duration: "620ms",
    code: 'args: {\n  "strategy": "high_res"\n}',
  },
  {
    icon: "barcode_scanner",
    name: "lookup_barcode",
    duration: "300ms",
    result: true,
    code: 'result: {\n  "match": "found"\n}',
  },
  {
    icon: "check_circle",
    name: "cross_reference_validator",
    duration: "120ms",
    active: true,
    code: 'result: {\n  "status": "success"\n}',
  },
];

function TimelineStep({ step }: { step: Step }) {
  return (
    <div className={`${step.active ? "mb-2" : "mb-8"} ml-8 relative group`}>
      <div
        className={`absolute -left-[42px] top-1 w-7 h-7 rounded-full flex items-center justify-center z-10 transition-colors ${
          step.active
            ? "bg-primary-container border-2 border-primary shadow-[0_0_8px_rgba(96,99,238,0.4)]"
            : "bg-surface-container-lowest border-2 border-surface-dim group-hover:border-primary"
        }`}
      >
        <Icon
          name={step.icon}
          size={14}
          fill={step.active}
          className={
            step.active
              ? "text-on-primary-container"
              : "text-outline-variant group-hover:text-primary transition-colors"
          }
        />
      </div>
      <div
        className={`bg-surface-container-lowest rounded-lg p-3 shadow-sm transition-colors relative overflow-hidden ${
          step.active ? "border border-primary/50" : "border border-outline-variant hover:border-outline"
        }`}
      >
        {step.active && <div className="absolute inset-0 bg-primary/5 pointer-events-none" />}
        <div className="flex justify-between items-start mb-2 relative z-10">
          <h4
            className={`font-data-tabular text-[13px] font-semibold ${
              step.active ? "text-primary" : "text-on-surface"
            }`}
          >
            {step.name}
          </h4>
          <span className="font-data-tabular text-[11px] text-outline">{step.duration}</span>
        </div>
        <div className="bg-surface-container rounded p-2 overflow-x-auto border border-outline-variant/50 relative z-10">
          <pre
            className={`font-data-tabular text-[10px] leading-tight ${
              step.result ? "text-primary-container" : "text-on-surface-variant"
            }`}
          >
            {step.code}
          </pre>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Header
 * ------------------------------------------------------------------------- */

function ProductHeader() {
  return (
    <header className="border-b border-outline-variant bg-surface/80 backdrop-blur-md sticky top-0 w-full z-40 flex justify-between items-center h-16 px-container-padding">
      <div className="flex items-center gap-4">
        <button className="md:hidden text-on-surface-variant hover:text-primary transition-colors focus:ring-1 focus:ring-primary rounded">
          <Icon name="menu" />
        </button>
        <div className="font-h3 text-h3 text-primary font-bold md:hidden">ProductDNA</div>
        <div className="hidden md:flex font-h3 text-h3 text-on-surface">Product Details</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Settings"
          className="p-2 text-on-surface-variant hover:text-primary transition-colors focus:ring-1 focus:ring-primary rounded-full"
        >
          <Icon name="settings" />
        </button>
        <button
          aria-label="Notifications"
          className="p-2 text-on-surface-variant hover:text-primary transition-colors focus:ring-1 focus:ring-primary rounded-full relative"
        >
          <Icon name="notifications" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full" />
        </button>
        <div className="w-8 h-8 ml-2 rounded-full bg-surface-variant border border-outline-variant overflow-hidden flex items-center justify-center">
          <Icon name="person" className="text-outline" />
        </div>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------------------
 * Content
 * ------------------------------------------------------------------------- */

function ProductContent({ product }: { product: Product }) {
  const confident = overallConfidence(product) >= 85;
  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
      {/* Left column */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6">
        {/* Image showcase */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-4 flex items-center justify-center min-h-[300px] relative overflow-hidden group">
          <div className="absolute inset-0 bg-surface-container-low opacity-50" />
          {product.image_url ? (
            <img
              alt={product.product_name.value ?? "Product"}
              className="relative z-10 max-h-80 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-500"
              src={assetUrl(product.image_url)}
            />
          ) : (
            <Icon name="image" size={64} className="text-outline relative z-10" />
          )}
          {confident && (
            <div className="absolute top-4 right-4 z-20 flex gap-2">
              <span className="bg-secondary-container text-on-secondary-container font-label-caps px-2 py-1 rounded border border-outline-variant/30 flex items-center gap-1 shadow-sm">
                <Icon name="verified" size={14} /> Highly Confident Match
              </span>
            </div>
          )}
        </div>

        {/* Review form */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6 border-b border-outline-variant pb-4">
            <div>
              <h2 className="font-h2 text-h2 text-on-surface">Extracted Attributes</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Review and commit data extracted by the AI agent.
              </p>
            </div>
            <button className="bg-primary text-on-primary font-body-sm px-4 py-2 rounded hover:bg-surface-tint transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2 whitespace-nowrap">
              Commit Record
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <Field label="Brand" field={product.brand} />
            <Field label="Product Name" field={product.product_name} />
            <Field label="Net Weight / Volume" field={product.weight} />
            <Field label="GTIN / Barcode" field={product.barcode} />
            <Field label="Category" field={product.category} />
            <Field label="Packaging Material" field={product.packaging} />
          </div>
        </div>
      </div>

      {/* Right column: telemetry */}
      <div className="w-full lg:w-1/3">
        <div className="sticky top-24">
          <div className="mb-6">
            <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-2">
              <Icon name="psychology" className="text-primary" />
              Agent Telemetry
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Trace of parallel extraction tasks.
            </p>
          </div>
          <div className="relative border-l-2 border-surface-dim ml-4 pb-4">
            {steps.map((step) => (
              <TimelineStep key={step.name} step={step} />
            ))}
            <div className="absolute -left-[5px] bottom-0 w-2 h-2 rounded-full bg-surface-dim" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const ProductDetail: React.FC = () => {
  const { data, loading, error, reload } = useFetch(() => getProducts());
  const products = data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Default to the most recently created product that finished extracting,
  // so we don't land on an empty/in-progress record.
  useEffect(() => {
    if (products.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId && products.some((p) => p.id === selectedId)) return;
    const done = products.filter((p) => p.status !== "extracting");
    const pool = done.length ? done : products;
    const newest = [...pool].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    setSelectedId(newest?.id ?? null);
  }, [products, selectedId]);

  const product = products.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="bg-background text-on-background font-body-base text-body-base flex min-h-screen">
      <SideNavBar active="Products" />
      <div className="flex-1 flex flex-col min-w-0 md:ml-60">
        <ProductHeader />
        <main className="flex-1 p-container-padding overflow-y-auto">
          {loading ? (
            <StateMessage variant="loading" />
          ) : error ? (
            <StateMessage
              variant="error"
              message={`${error}. Is the backend running on localhost:8000?`}
              onRetry={reload}
            />
          ) : products.length === 0 ? (
            <StateMessage
              variant="empty"
              title="No products yet"
              message="Upload a product image to see its extracted attributes here."
            />
          ) : (
            <div className="max-w-6xl mx-auto flex flex-col gap-6">
              {/* Product selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-label-caps text-label-caps text-on-surface-variant">
                  Viewing
                </span>
                <div className="relative">
                  <select
                    value={selectedId ?? ""}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="appearance-none bg-surface-container-lowest text-on-surface font-body-sm pl-3 pr-9 py-2 border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer max-w-xs truncate"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.product_name.value || `Untitled`} · {statusLabel(p.status)}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                    <Icon name="expand_more" size={18} />
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  {products.length} total
                </span>
                <button
                  onClick={reload}
                  className="ml-auto flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors font-body-sm"
                >
                  <Icon name="refresh" size={18} /> Refresh
                </button>
              </div>

              {product && product.status === "extracting" && (
                <div className="flex items-center gap-2 bg-primary-container/10 border border-primary/20 text-on-surface rounded-lg p-3 font-body-sm text-body-sm">
                  <Icon name="sync" size={16} className="text-primary animate-spin" />
                  This product is still being extracted — attributes will populate shortly.
                </div>
              )}

              {product && <ProductContent product={product} />}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProductDetail;
