import React from "react";
import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";
import Icon from "../components/Icon";

/* ----------------------------------------------------------------------------
 * Data
 * ------------------------------------------------------------------------- */

interface ProductSide {
  source: string;
  title: string;
  subtitle: string;
  image: string;
  upc: string;
  color: string;
  /** highlight the colour value as a conflicting attribute */
  colorConflict?: boolean;
  /** show the "Data Conflict" marker on this side */
  conflict?: boolean;
}

interface DuplicatePair {
  match: number;
  a: ProductSide;
  b: ProductSide;
}

const pairs: DuplicatePair[] = [
  {
    match: 98,
    a: {
      source: "ERP System",
      title: "Nike Air Max 270 React",
      subtitle: "Nike · Footwear · Sneakers",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAiHRPAYA7ZZjbCjFyKQ-BAulY51W_t8_y-wvGURcIW_7SU1Q75XCdD-XOL-L0HTbfqKgA25DSWLVDeRS9qFRpqjlO2LK3z5CsIde9Ao81i1_-ifXlDCYMe2mk1T7u9RYiZgXvuCm6DNp_yeXS9efc0W_rxPLda3SxHIl5KdN1x-tO-ArRd328TMZlq5xpxfOHBIUbueJ-OX3MZnJFKolzrcFhsRgoIELtvGEiUY_e4HOo3duOCRDGdlovApR01DEtFkWOxufcwiB5d",
      upc: "193151688562",
      color: "Red/White/Black",
    },
    b: {
      source: "Vendor Feed CSV",
      title: "Nike Mens Air Max 270",
      subtitle: "Nike · Shoes",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDlxRj6Nu2_ZlGPuo6zHrJ9U7_grYb_-CNVsPu90gj257Dylb1MAauC7JXICB3GD16cvYVVtfIlPfEOcHoV3hAGljhQU_VhXOndTxvwgVPo2XHCLf_N4FGyqOb435keqqycoQpuERqTrD0QhqXpyVz4oLf3SM89l4FLNwDezb1F-z4qDjhhWbEQAHxjSTLheHLwvAunx602s0Gq9XU5CycexT3vNTXHLcWyKDzl_eGwXxCRcLm8w9lM22Lygafb93W5z9kMr57f1VE4",
      upc: "193151688562",
      color: "Crimson/Wht",
      colorConflict: true,
      conflict: true,
    },
  },
];

/* ----------------------------------------------------------------------------
 * Building blocks
 * ------------------------------------------------------------------------- */

function ProductSideCard({ side }: { side: ProductSide }) {
  return (
    <div className="flex-1 flex gap-4 p-4 rounded-lg bg-surface-container-low border border-transparent group-hover:border-surface-dim transition-colors relative">
      {side.conflict && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-tertiary-container bg-tertiary-fixed px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">
          <Icon name="error" size={14} /> Data Conflict
        </div>
      )}
      <img
        alt={side.title}
        className="w-24 h-24 object-cover rounded bg-surface border border-outline-variant shrink-0"
        src={side.image}
      />
      <div className="flex flex-col min-w-0">
        <span className="font-label-caps text-label-caps text-secondary tracking-wider mb-1">
          Source: {side.source}
        </span>
        <h3 className="font-h3 text-h3 text-on-surface truncate mb-1">{side.title}</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-3">{side.subtitle}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-auto">
          <div className="flex flex-col">
            <span className="font-data-tabular text-data-tabular text-outline">UPC</span>
            <span className="font-data-tabular text-data-tabular text-on-surface">{side.upc}</span>
          </div>
          <div className="flex flex-col">
            <span className="font-data-tabular text-data-tabular text-outline">Color</span>
            <span
              className={
                side.colorConflict
                  ? "font-data-tabular text-data-tabular text-tertiary-container bg-tertiary-fixed-dim px-1 rounded -ml-1 inline-block w-max"
                  : "font-data-tabular text-data-tabular text-on-surface"
              }
            >
              {side.color}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DuplicatePairCard({ pair }: { pair: DuplicatePair }) {
  return (
    <article className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-row items-stretch gap-6 hover:border-outline transition-colors group">
      <ProductSideCard side={pair.a} />

      {/* Center action & score panel */}
      <div className="w-48 shrink-0 flex flex-col items-center justify-center gap-5 border-x border-outline-variant/30 px-2">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-1 bg-primary-container text-on-primary-container px-3 py-1.5 rounded-full border border-primary/20 shadow-sm">
            <Icon name="check_circle" size={16} />
            <span className="font-label-caps text-label-caps font-bold">{pair.match}% Match</span>
          </div>
          <span className="font-data-tabular text-data-tabular text-on-surface-variant">
            System Confidence
          </span>
        </div>
        <div className="flex flex-col gap-2 w-full px-4">
          <button className="w-full bg-primary text-on-primary font-body-sm text-body-sm py-2 rounded shadow-sm hover:bg-surface-tint transition-colors text-center font-medium">
            Merge Records
          </button>
          <button className="w-full bg-transparent border border-outline-variant text-on-surface font-body-sm text-body-sm py-2 rounded hover:bg-surface-container transition-colors text-center">
            Keep Separate
          </button>
        </div>
      </div>

      <ProductSideCard side={pair.b} />
    </article>
  );
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const Duplicates: React.FC = () => {
  return (
    <div className="bg-background text-on-background font-body-base text-body-base antialiased flex min-h-screen">
      <SideNavBar active="Duplicates" />
      <div className="flex-1 md:ml-60 flex flex-col min-w-0">
        <TopAppBar />
        <main className="flex-1 overflow-y-auto p-section-margin bg-background">
          {/* Page header */}
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
                124 Pending Tasks
              </span>
              <button className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface font-body-sm text-body-sm px-4 py-2 rounded shadow-sm hover:bg-surface-container transition-colors">
                <Icon name="filter_list" size={18} />
                Filter
              </button>
            </div>
          </div>

          {/* Queue */}
          <div className="flex flex-col gap-4">
            {pairs.map((pair, idx) => (
              <DuplicatePairCard key={idx} pair={pair} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Duplicates;
