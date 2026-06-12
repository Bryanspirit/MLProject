import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  special?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, special = false }) => {
  return (
    <div className={`bg-surface-container-lowest border border-outline-variant rounded-lg p-5 flex flex-col gap-2 ${special ? 'border-l-4 border-l-tertiary-container' : ''}`}>
      <h3 className="font-body-sm text-body-sm text-on-surface-variant uppercase tracking-wider">{title}</h3>
      <div className="flex items-end gap-3 mt-1">
        <span className={`font-h1 text-h1 ${special ? 'text-tertiary-container' : 'text-on-surface'}`}>{value}</span>
        {change && (
          <span className="font-data-tabular text-data-tabular text-primary font-medium bg-primary-fixed-dim px-2 py-0.5 rounded-full mb-1">
            {change}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;