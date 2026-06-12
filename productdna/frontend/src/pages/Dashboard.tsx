import React from 'react';
import SideNavBar from '../components/SideNavBar';
import TopAppBar from '../components/TopAppBar';
import StatCard from '../components/StatCard';
import RecentExtractionsTable from '../components/RecentExtractionsTable';

const Dashboard: React.FC = () => {
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
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Products processed" value="1,284" change="+12%" />
            <StatCard title="Avg confidence" value="92%" change="+2%" />
            <StatCard title="Duplicates pending" value="14" />
            <StatCard title="Needs review" value="28" special={true} />
          </section>
          <RecentExtractionsTable />
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
