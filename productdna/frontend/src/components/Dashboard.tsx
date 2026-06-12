"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { getStats, getExtractions, Extraction } from "../api/client";

function ConfidenceBadge({ value }: { value: number }) {
  const color =
    value >= 90
      ? "bg-green-100 text-green-700"
      : value >= 80
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-600";
  return (
    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${color}`}>
      {value}%
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isReview = status === "Needs Review";
  return (
    <span
      className={`flex items-center gap-1.5 text-sm font-medium ${
        isReview ? "text-orange-500" : "text-green-600"
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isReview ? "bg-orange-400" : "bg-green-500"
        }`}
      />
      {status}
    </span>
  );
}

export default function Dashboard() {
  // Using any[] for stats for now since we're using the dashboard API format,
  // not the raw Stats model.
  const [stats, setStats] = useState<any[]>([]);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statsData, extractionsData] = await Promise.all([
          getStats(),
          getExtractions(),
        ]);
        // The new python API returns a list of dictionaries for stats
        setStats(statsData as any);
        setExtractions(extractionsData);
      } catch (err) {
        setError("Failed to load data from the server.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search products, brands, or attributes..."
          className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`bg-white rounded-xl p-5 border ${
              stat.highlight
                ? "border-l-4 border-l-orange-400 border-t-gray-200 border-r-gray-200 border-b-gray-200"
                : "border-gray-200"
            }`}
          >
            <p className="text-xs font-semibold text-gray-400 tracking-wide uppercase mb-2">
              {stat.label}
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`text-3xl font-bold ${
                  stat.highlight ? "text-orange-500" : "text-gray-800"
                }`}
              >
                {stat.value}
              </span>
              {stat.badge && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${stat.badgeColor}`}
                >
                  {stat.badge}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Extractions */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            Recent Extractions
          </h2>
          <button className="text-sm font-medium text-indigo-500 hover:text-indigo-700 transition-colors">
            View All
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
              <th className="px-6 py-3 text-left w-16">Item</th>
              <th className="px-4 py-3 text-left">Brand</th>
              <th className="px-4 py-3 text-left">Product Name</th>
              <th className="px-4 py-3 text-left">Confidence</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {extractions.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center text-lg">
                    {item.image}
                  </div>
                </td>
                <td className="px-4 py-4 text-gray-600">{item.brand}</td>
                <td className="px-4 py-4 font-medium text-gray-800">
                  {item.productName}
                </td>
                <td className="px-4 py-4">
                  <ConfidenceBadge value={item.confidence} />
                </td>
                <td className="px-4 py-4">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-6 py-4 text-right text-gray-400">
                  {item.timestamp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}