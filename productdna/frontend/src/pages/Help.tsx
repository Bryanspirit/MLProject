import React, { useState } from "react";
import SideNavBar from "../components/SideNavBar";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";

/* ----------------------------------------------------------------------------
 * Data
 * ------------------------------------------------------------------------- */

const topics = [
  {
    icon: "rocket_launch",
    title: "Getting Started",
    desc: "Set up your workspace and ingest your first batch of products.",
  },
  {
    icon: "upload_file",
    title: "Uploading Assets",
    desc: "Supported formats, batch limits, and how extraction is triggered.",
  },
  {
    icon: "fact_check",
    title: "Reviewing Extractions",
    desc: "Understand confidence scores and commit clean records.",
  },
  {
    icon: "content_copy",
    title: "Resolving Duplicates",
    desc: "Merge or keep records apart to protect master data integrity.",
  },
  {
    icon: "smart_toy",
    title: "Using Ask",
    desc: "Query your catalog in natural language and export results.",
  },
  {
    icon: "api",
    title: "API & Integrations",
    desc: "Connect ProductDNA to your ERP, PIM, and vendor feeds.",
  },
];

const faqs = [
  {
    q: "How is the confidence score calculated?",
    a: "Each extracted attribute is scored by the agent based on source clarity (OCR quality, barcode scans) and cross-referencing against trusted databases such as GS1. The overall record score is a weighted aggregate of its attributes.",
  },
  {
    q: "What file types can I upload?",
    a: "You can upload .jpg and .png product images, .csv metadata files, and .zip batch archives up to 500MB per batch. Recognized file types are automatically categorized on ingestion.",
  },
  {
    q: "Can I undo a merge?",
    a: "Yes. Merges are reversible from the product's history panel for 30 days. After that, the surviving record becomes the permanent master and the action is archived.",
  },
  {
    q: "Does Ask modify my data?",
    a: "No. Ask is read-only — it generates and runs SELECT queries against your catalog. It never writes, updates, or deletes records.",
  },
];

/* ----------------------------------------------------------------------------
 * Building blocks
 * ------------------------------------------------------------------------- */

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-outline-variant last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left group"
      >
        <span className="font-body-base text-body-base font-medium text-on-surface group-hover:text-primary transition-colors">
          {q}
        </span>
        <Icon
          name="expand_more"
          size={20}
          className={`text-on-surface-variant transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="font-body-sm text-body-sm text-on-surface-variant pb-4 -mt-1 max-w-3xl">
          {a}
        </p>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const Help: React.FC = () => {
  return (
    <div className="bg-background text-on-background font-body-base text-body-base flex min-h-screen">
      <SideNavBar active="Help" />
      <div className="flex-1 md:ml-60 flex flex-col min-w-0">
        <PageHeader title="Help" />

        <main className="flex-1 overflow-y-auto p-section-margin">
          <div className="max-w-5xl mx-auto flex flex-col gap-section-margin">
            {/* Hero / search */}
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center mx-auto mb-4">
                <Icon name="help" size={26} />
              </div>
              <h1 className="font-h1 text-h1 text-on-surface mb-2">How can we help?</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
                Search the docs or browse the topics below.
              </p>
              <div className="relative max-w-xl mx-auto">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  <Icon name="search" size={20} />
                </span>
                <input
                  type="text"
                  placeholder="Search help articles..."
                  className="w-full bg-surface text-on-surface font-body-base pl-10 pr-4 py-3 border border-outline-variant rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow"
                />
              </div>
            </div>

            {/* Topics */}
            <div>
              <h2 className="font-h3 text-h3 text-on-surface mb-4">Browse topics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map((t) => (
                  <a
                    key={t.title}
                    href="#/help"
                    className="bg-surface-container-lowest border border-outline-variant rounded-xl p-5 flex flex-col gap-2 hover:border-primary hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high text-on-surface-variant group-hover:bg-primary-fixed group-hover:text-primary flex items-center justify-center transition-colors mb-1">
                      <Icon name={t.icon} size={22} />
                    </div>
                    <h3 className="font-h3 text-h3 text-on-surface group-hover:text-primary transition-colors">
                      {t.title}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{t.desc}</p>
                  </a>
                ))}
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h2 className="font-h3 text-h3 text-on-surface mb-4">Frequently asked questions</h2>
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-6">
                {faqs.map((f) => (
                  <FaqItem key={f.q} q={f.q} a={f.a} />
                ))}
              </div>
            </div>

            {/* Contact */}
            <div className="bg-primary-fixed border border-primary/20 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0">
                  <Icon name="support_agent" size={22} />
                </div>
                <div>
                  <h3 className="font-h3 text-h3 text-on-surface">Still need help?</h3>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Our support team typically replies within a few hours.
                  </p>
                </div>
              </div>
              <button className="bg-primary text-on-primary font-body-sm px-5 py-2.5 rounded shadow-sm hover:bg-surface-tint transition-colors font-medium whitespace-nowrap shrink-0">
                Contact Support
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Help;
