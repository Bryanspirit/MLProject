import React, { useCallback, useEffect, useState } from "react";
import SideNavBar from "../components/SideNavBar";
import PageHeader from "../components/PageHeader";
import StateMessage from "../components/StateMessage";
import ProductReviewPanel from "../components/ProductReviewPanel";
import Icon from "../components/Icon";
import { getProducts, approveProduct, Product } from "../api/client";
import { useToast } from "../hooks/useToast";

/* ----------------------------------------------------------------------------
 * Review queue
 *
 * Steps a steward through every `needs_review` product one at a time, so they
 * never have to hunt rows on the Products page. Keyboard flow for throughput:
 *   ← / k   previous        → / j   next        a   approve & advance
 * (Shortcuts are ignored while typing in a field.)
 * ------------------------------------------------------------------------- */

const Review: React.FC = () => {
  const [queue, setQueue] = useState<Product[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    let alive = true;
    getProducts({ status: "needs_review" })
      .then((ps) => {
        if (!alive) return;
        setQueue(ps);
        setLoading(false);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Failed to load the review queue.");
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const current = queue[idx];

  const go = useCallback(
    (delta: number) =>
      setIdx((i) => Math.min(Math.max(i + delta, 0), Math.max(queue.length - 1, 0))),
    [queue.length]
  );

  // Drop the current item from the queue; idx then points at the next one
  // (clamped) so the steward keeps moving forward.
  const removeCurrent = useCallback(() => {
    setQueue((q) => q.filter((_, i) => i !== idx));
    // After removal the new length is queue.length - 1, so the last valid index
    // is queue.length - 2. Clamp without going negative.
    setIdx((i) => Math.max(0, Math.min(i, queue.length - 2)));
  }, [idx, queue.length]);

  // Reflect an in-place save (status still needs_review) or approval.
  const handleReviewed = useCallback(
    (updated: Product) => {
      if (updated.status === "approved") {
        removeCurrent();
      } else {
        setQueue((q) => q.map((p) => (p.id === updated.id ? updated : p)));
      }
    },
    [removeCurrent]
  );

  const approveCurrent = useCallback(async () => {
    if (!current) return;
    try {
      await approveProduct(current.id);
      toast.success("Approved");
      removeCurrent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approve failed");
    }
  }, [current, removeCurrent, toast]);

  // Keyboard navigation — skipped while a form control is focused so editing
  // a field never triggers a shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "j") go(1);
      else if (e.key === "ArrowLeft" || e.key === "k") go(-1);
      else if (e.key === "a") approveCurrent();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, approveCurrent]);

  return (
    <div className="bg-background text-on-background font-body-base text-body-base flex min-h-screen">
      <SideNavBar active="Review" />
      <div className="flex-1 md:ml-60 flex flex-col min-w-0 bg-background">
        <PageHeader title="Review Queue" />

        <main className="flex-1 overflow-y-auto p-section-margin">
          <div className="max-w-4xl mx-auto space-y-section-margin">
            {loading ? (
              <StateMessage variant="loading" message="Loading the review queue…" />
            ) : error ? (
              <StateMessage variant="error" message={error} />
            ) : queue.length === 0 ? (
              <StateMessage
                variant="empty"
                message="Nothing to review — every extraction is approved or pending."
              />
            ) : (
              <>
                {/* Queue position + nav */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="font-h1 text-h1 text-on-surface">Reviewing</h2>
                    <span className="font-label-caps text-label-caps bg-surface-variant text-on-surface-variant px-2 py-1 rounded">
                      {idx + 1} / {queue.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => go(-1)}
                      disabled={idx === 0}
                      aria-label="Previous (←)"
                      className="inline-flex items-center gap-1 font-body-sm text-body-sm text-on-surface border border-outline-variant rounded-lg px-3 py-1.5 hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Icon name="chevron_left" size={16} /> Prev
                    </button>
                    <button
                      onClick={() => go(1)}
                      disabled={idx >= queue.length - 1}
                      aria-label="Next (→)"
                      className="inline-flex items-center gap-1 font-body-sm text-body-sm text-on-surface border border-outline-variant rounded-lg px-3 py-1.5 hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Next <Icon name="chevron_right" size={16} />
                    </button>
                  </div>
                </div>

                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Shortcuts: <kbd>←</kbd>/<kbd>k</kbd> prev · <kbd>→</kbd>/<kbd>j</kbd> next ·{" "}
                  <kbd>a</kbd> approve &amp; advance.
                </p>

                {current && (
                  <div className="border border-outline-variant rounded-lg bg-surface-container-lowest p-5 shadow-sm">
                    <ProductReviewPanel
                      key={current.id}
                      product={current}
                      onChange={handleReviewed}
                      onSuccess={toast.success}
                      onError={toast.error}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Review;
