import React from 'react';
import SideNavBar from '../components/SideNavBar';
import TopAppBar from '../components/TopAppBar';
import StatCard from '../components/StatCard';
import RecentExtractionsTable from '../components/RecentExtractionsTable';
import { getStats, getProducts, Stats } from '../api/client';
import { useFetch } from '../hooks/useFetch';

/** Stacked bar showing the share of products in each lifecycle state. */
function StatusPipeline({ stats }: { stats: Stats }) {
  const segments = [
    { key: 'needs_review', label: 'Needs Review', count: stats.needs_review, bar: 'bg-primary', dot: 'bg-primary' },
    { key: 'approved', label: 'Approved', count: stats.approved, bar: 'bg-tertiary', dot: 'bg-tertiary' },
    { key: 'extracting', label: 'Extracting', count: stats.extracting, bar: 'bg-outline', dot: 'bg-outline' },
    { key: 'failed', label: 'Failed', count: stats.failed, bar: 'bg-error', dot: 'bg-error' },
  ];
  const total = segments.reduce((a, s) => a + s.count, 0);
  if (total === 0) return null;

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-5">
      <h2 className="font-h3 text-h3 text-on-surface mb-4">Extraction Pipeline</h2>
      <div className="flex w-full h-3 rounded-full overflow-hidden bg-surface-variant">
        {segments.map(
          (s) =>
            s.count > 0 && (
              <div
                key={s.key}
                className={`${s.bar} h-full`}
                style={{ width: `${(s.count / total) * 100}%` }}
                title={`${s.label}: ${s.count}`}
              />
            )
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
            <span className="font-body-sm text-body-sm text-on-surface-variant">{s.label}</span>
            <span className="font-data-tabular text-data-tabular text-on-surface font-medium">{s.count}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const Dashboard: React.FC = () => {
  const stats = useFetch(getStats);
  const products = useFetch(() => getProducts());

  const recent = (products.data ?? []).slice(0, 8);

  const dash = (v: number | undefined, suffix = '') =>
    stats.loading ? '…' : stats.error || v === undefined ? '—' : `${v}${suffix}`;

  return (
    <div className="bg-background text-on-background font-body-base text-body-base min-h-screen">
      <SideNavBar />
      <div className="md:ml-60">
        <TopAppBar />
        <main className="p-container-padding flex flex-col gap-section-margin max-w-7xl mx-auto">
          <div className="flex flex-col gap-1">
            <h1 className="font-h1 text-h1 text-on-surface">Dashboard</h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Overview of product extraction activity and items needing attention.
            </p>
          </div>

          {stats.error && (
            <p className="font-body-sm text-body-sm text-error">
              Couldn’t reach the API ({stats.error}). Is the backend running on localhost:8000?
            </p>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Products processed"
              value={dash(stats.data?.products_processed)}
              icon="inventory_2"
              hint={stats.data ? `${stats.data.approved} approved` : undefined}
            />
            <StatCard
              title="Avg confidence"
              value={dash(stats.data?.avg_confidence, '%')}
              icon="insights"
            />
            <StatCard
              title="Needs review"
              value={dash(stats.data?.needs_review)}
              icon="rate_review"
              href="#/products"
              hint="Open review queue"
              special={(stats.data?.needs_review ?? 0) > 0}
            />
            <StatCard
              title="Duplicates pending"
              value={dash(stats.data?.duplicates_pending)}
              icon="content_copy"
              href="#/duplicates"
              hint="Resolve duplicates"
            />
          </section>

          {stats.data && <StatusPipeline stats={stats.data} />}

          <RecentExtractionsTable
            extractions={recent}
            loading={products.loading}
            error={products.error}
            onRetry={products.reload}
          />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
