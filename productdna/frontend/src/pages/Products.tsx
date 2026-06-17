import React, { useEffect, useState } from "react";
import SideNavBar from "../components/SideNavBar";
import PageHeader from "../components/PageHeader";
import ProductTable from "../components/ProductTable";
import Icon from "../components/Icon";
import { getProducts } from "../api/client";
import { useFetch } from "../hooks/useFetch";

const STATUS_TABS = [
  { key: "", label: "All" },
  { key: "needs_review", label: "Needs Review" },
  { key: "approved", label: "Approved" },
  { key: "failed", label: "Failed" },
];

const Products: React.FC = () => {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useFetch(
    () => getProducts({ status: status || undefined, search: debounced || undefined }),
    [status, debounced]
  );

  return (
    <div className="bg-background text-on-background font-body-base text-body-base flex min-h-screen">
      <SideNavBar active="Products" />
      <div className="flex-1 md:ml-60 flex flex-col min-w-0 bg-background">
        <PageHeader title="Products" />

        <main className="flex-1 overflow-y-auto p-section-margin">
          <div className="max-w-6xl mx-auto space-y-section-margin">
            <div>
              <h2 className="font-h1 text-h1 text-on-surface mb-2">Product Master</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Every extracted product. Filter by review state or search by name and brand,
                then open one to review and approve its attributes.
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex flex-wrap gap-1">
                {STATUS_TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setStatus(t.key)}
                    className={`font-body-sm text-body-sm px-3 py-1.5 rounded-lg border transition-colors ${
                      status === t.key
                        ? "bg-primary-fixed text-primary border-primary/30"
                        : "text-on-surface-variant border-outline-variant hover:bg-surface-container"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="relative flex items-center w-full sm:w-72 h-10 rounded-lg bg-surface-container-low border border-outline-variant overflow-hidden focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                <div className="grid place-items-center h-full w-10 text-on-surface-variant">
                  <Icon name="search" size={20} />
                </div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name or brand…"
                  className="h-full w-full outline-none text-body-sm font-body-sm text-on-surface bg-transparent pr-3"
                />
              </div>
            </div>

            <ProductTable
              products={data ?? []}
              loading={loading}
              error={error}
              onRetry={reload}
              emptyMessage={
                debounced || status
                  ? "No products match these filters."
                  : "Upload product images to get started."
              }
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Products;
