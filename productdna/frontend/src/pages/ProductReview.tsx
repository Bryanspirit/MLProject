import React, { useEffect, useRef, useState } from "react";
import { getProduct, Product } from "../api/client";
import StateMessage from "../components/StateMessage";
import ProductReviewPanel from "../components/ProductReviewPanel";
import SideNavBar from "../components/SideNavBar";
import PageHeader from "../components/PageHeader";
import { useToast } from "../hooks/useToast";

function useProductIdFromHash() {
  const [id, setId] = useState<string | undefined>();
  useEffect(() => {
    const read = () => {
      const parts = window.location.hash.slice(2).split("/");
      if (parts[0] === "products" && parts[1]) setId(parts[1]);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  return id;
}

const ProductReviewPage: React.FC = () => {
  const id = useProductIdFromHash();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const poll = useRef<number | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!id) return;
    let active = true;

    const clearPoll = () => {
      if (poll.current) window.clearInterval(poll.current);
      poll.current = null;
    };

    (async () => {
      try {
        const data = await getProduct(id);
        if (!active) return;
        setProduct(data);
        // Still extracting? Poll until it settles.
        if (data.status === "extracting") {
          poll.current = window.setInterval(async () => {
            try {
              const updated = await getProduct(id);
              if (!active) return;
              if (updated.status !== "extracting") {
                setProduct(updated);
                clearPoll();
              }
            } catch {
              clearPoll();
            }
          }, 3000);
        }
      } catch {
        if (active) setError("Failed to load this product.");
      }
    })();

    return () => {
      active = false;
      clearPoll();
    };
  }, [id]);

  let content: React.ReactNode;
  if (error) {
    content = <StateMessage variant="error" title="Error" message={error} />;
  } else if (!product || product.status === "extracting") {
    content = (
      <StateMessage
        variant="loading"
        title="Extraction in progress"
        message="The AI is analyzing your product. This may take a moment…"
      />
    );
  } else {
    content = (
      <div className="max-w-3xl mx-auto border border-outline-variant rounded-lg bg-surface-container-lowest shadow-sm p-6">
        <ProductReviewPanel
          product={product}
          onChange={setProduct}
          onSuccess={toast.success}
          onError={toast.error}
        />
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body-base text-body-base flex min-h-screen">
      <SideNavBar active="Products" />
      <div className="flex-1 md:ml-60 flex flex-col min-w-0 bg-background">
        <PageHeader title="Product Review" />
        <main className="flex-1 overflow-y-auto p-section-margin">
          <a
            href="#/products"
            className="inline-flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors mb-4 max-w-3xl mx-auto w-full"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              arrow_back
            </span>
            Back to products
          </a>
          {content}
        </main>
      </div>
    </div>
  );
};

export default ProductReviewPage;
