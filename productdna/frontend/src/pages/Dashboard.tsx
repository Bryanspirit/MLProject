import React from 'react';
import SideNavBar from '../components/SideNavBar';
import TopAppBar from '../components/TopAppBar';
import StatCard from '../components/StatCard';
import RecentExtractionsTable from '../components/RecentExtractionsTable';
import { getStats, getProducts } from '../api/client';
import { useFetch } from '../hooks/useFetch';

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
            <StatCard title="Products processed" value={dash(stats.data?.products_processed)} />
            <StatCard
              title="Avg confidence"
              value={dash(stats.data ? Math.round(stats.data.avg_confidence) : undefined, '%')}
            />
            <StatCard title="Duplicates pending" value={dash(stats.data?.duplicates_pending)} />
            <StatCard title="Needs review" value={dash(stats.data?.needs_review)} special={true} />
          </section>

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
