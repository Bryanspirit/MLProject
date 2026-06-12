import React from "react";
import SideNavBar from "../components/SideNavBar";
import Icon from "../components/Icon";

/* ----------------------------------------------------------------------------
 * Small building blocks
 * ------------------------------------------------------------------------- */

function Tooltip({ text }: { text: string }) {
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

function Field({
  label,
  confidence,
  tooltip,
  children,
}: {
  label: string;
  confidence: number;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <label className="font-label-caps text-label-caps text-on-surface-variant">
          {label}
        </label>
        <div className="flex items-center gap-2">
          <span className="bg-primary-container/20 text-primary-container font-data-tabular px-1.5 py-0.5 rounded text-[10px]">
            {confidence}%
          </span>
          <Tooltip text={tooltip} />
        </div>
      </div>
      {children}
    </div>
  );
}

const inputClasses =
  "w-full bg-surface text-on-surface font-body-sm px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow";

/* ----------------------------------------------------------------------------
 * Agent telemetry timeline
 * ------------------------------------------------------------------------- */

interface Step {
  icon: string;
  name: string;
  duration: string;
  code: string;
  /** result lines are tinted to read as output rather than args */
  result?: boolean;
  /** final/highlighted step */
  active?: boolean;
}

const steps: Step[] = [
  {
    icon: "visibility",
    name: "vision_describe",
    duration: "450ms",
    code: 'args: {\n  "input": "img_ref_29a",\n  "focus": "labels"\n}',
  },
  {
    icon: "text_fields",
    name: "extract_text_ocr",
    duration: "620ms",
    code: 'args: {\n  "strategy": "high_res",\n  "langs": ["en", "it"]\n}',
  },
  {
    icon: "barcode_scanner",
    name: "lookup_barcode",
    duration: "300ms",
    result: true,
    code: 'result: {\n  "match": "found",\n  "name": "San Pellegrino"\n}',
  },
  {
    icon: "check_circle",
    name: "cross_reference_validator",
    duration: "120ms",
    active: true,
    code: 'result: {\n  "status": "success",\n  "confidence_score": 0.98\n}',
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
          step.active
            ? "border border-primary/50"
            : "border border-outline-variant hover:border-outline"
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
 * Page header (page-specific: shows a title rather than the dashboard search)
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
        <div className="w-8 h-8 ml-2 rounded-full bg-secondary-container border border-outline-variant overflow-hidden">
          <img
            alt="User Profile"
            className="w-full h-full object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjgnpc8ilgDRJzSNNNc34cS2G0_7qZ9SIbtQILmFGBuEE3zoit9QzD0hRefUtHwG8OB0GCf9IMQvXf8JnN9XU7VuqSsgXqpRecmsTbCdCb61zJMxI6RNfYyyp_TO5aaL6pZjITB7L5o5lgaZcd3wnZ81PpSPahxFh1I2RkFX2h94oSqJemcqQ7jykDMhq-Npc7cvWkLAjU8jIWYsLUTJxDd_eEvOOrVnfSGUyX5nEiNI8r42N0izf3KDWt3KKuFU0t_z0W6NQVzfLF"
          />
        </div>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const ProductDetail: React.FC = () => {
  return (
    <div className="bg-background text-on-background font-body-base text-body-base flex min-h-screen">
      <SideNavBar active="Products" />
      <div className="flex-1 flex flex-col min-w-0 md:ml-60">
        <ProductHeader />
        <main className="flex-1 p-container-padding overflow-y-auto">
          <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
            {/* Left Column: Product & Form */}
            <div className="w-full lg:w-2/3 flex flex-col gap-6">
              {/* Product Image Showcase */}
              <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-4 flex items-center justify-center min-h-[300px] relative overflow-hidden group">
                <div className="absolute inset-0 bg-surface-container-low opacity-50" />
                <img
                  alt="San Pellegrino Bottle"
                  className="relative z-10 max-h-80 object-contain drop-shadow-md mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2B05aY6J-glsK0dbHlAs4MkHLQvKLfB7lDTdlfGDRhdMtjf9Z2B9sfcuoVEz1RreGK8_Y4RX0JVtlAfQ0-WIynxzaJhP2cHLSVugD6KjXOLlcfmiUj_a1zByU0vnH7rQCmtSel7hr3F0DxqHuDWc3x2GbN9EDCz2fp0jsDJ9h5uYZo16Br8hKdBlsqKgNzuHN5FO9Ex-ae4NLtzN3yoKMSFq-vct7Dm1T68vh9AZHIV7htN3WbYfgbf4FrlgIPaM_3lbGUp372vL-"
                />
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <span className="bg-secondary-container text-on-secondary-container font-label-caps px-2 py-1 rounded border border-outline-variant/30 flex items-center gap-1 shadow-sm">
                    <Icon name="verified" size={14} /> Highly Confident Match
                  </span>
                </div>
              </div>

              {/* Editable Review Form */}
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
                  <Field label="Brand" confidence={99} tooltip="Extracted via OCR and cross-referenced with GS1 database.">
                    <input className={inputClasses} type="text" defaultValue="San Pellegrino" />
                  </Field>

                  <Field label="Product Name" confidence={98} tooltip="Composited from primary label text blocks.">
                    <input
                      className={inputClasses}
                      type="text"
                      defaultValue="Sparkling Natural Mineral Water"
                    />
                  </Field>

                  <Field label="Net Weight / Volume" confidence={95} tooltip="Located near bottom edge, verified standard format.">
                    <div className="relative">
                      <input
                        className={`${inputClasses} pr-12`}
                        type="text"
                        defaultValue="750"
                      />
                      <span className="absolute inset-y-0 right-0 flex items-center pr-3 font-data-tabular text-on-surface-variant text-[12px] pointer-events-none">
                        ml
                      </span>
                    </div>
                  </Field>

                  <Field label="GTIN / Barcode" confidence={100} tooltip="Direct scan from EAN-13 barcode block.">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-outline-variant">
                        <Icon name="barcode" size={16} />
                      </span>
                      <input
                        className={`${inputClasses} pl-8 font-data-tabular tracking-wider`}
                        type="text"
                        defaultValue="8002270014901"
                      />
                    </div>
                  </Field>

                  <Field label="Category" confidence={96} tooltip="Inferred from product context and taxonomy mapping.">
                    <select className={`${inputClasses} appearance-none cursor-pointer`} defaultValue="Beverage">
                      <option>Beverage</option>
                      <option>Food</option>
                      <option>Household</option>
                    </select>
                  </Field>

                  <Field label="Packaging Material" confidence={99} tooltip="Visual identification of material properties.">
                    <input className={inputClasses} type="text" defaultValue="Glass Bottle" />
                  </Field>
                </div>
              </div>
            </div>

            {/* Right Column: Extraction Agent Timeline */}
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
                  {/* End dot */}
                  <div className="absolute -left-[5px] bottom-0 w-2 h-2 rounded-full bg-surface-dim" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProductDetail;
