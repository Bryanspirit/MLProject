import React, { useState } from "react";
import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";
import Icon from "../components/Icon";
import { ask, QueryResult } from "../api/client";

/* ----------------------------------------------------------------------------
 * Building blocks
 * ------------------------------------------------------------------------- */

function PanelHeader({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 border-b border-outline-variant bg-surface-container flex justify-between items-center">
      <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-2">
        <Icon name={icon} size={16} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const SUGGESTION = "Which manufacturers have the most beverage products?";

const Ask: React.FC = () => {
  const [question, setQuestion] = useState(SUGGESTION);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function execute() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await ask(q));
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const columns =
    result && result.results.length > 0 ? Object.keys(result.results[0]) : [];

  return (
    <div className="bg-background text-on-background antialiased flex min-h-screen">
      <SideNavBar active="Ask" />
      <div className="flex-grow md:ml-60 flex flex-col min-w-0 bg-surface-bright">
        <TopAppBar />

        <main className="flex-grow overflow-y-auto custom-scrollbar p-section-margin flex flex-col max-w-5xl mx-auto w-full">
          {/* Command bar */}
          <div className="w-full mb-8 relative group">
            <div className="absolute inset-0 bg-primary/5 rounded-xl blur-xl transition-all duration-300 group-focus-within:bg-primary/10" />
            <div className="relative flex items-center bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
              <div className="pl-4 text-primary">
                <Icon name="smart_toy" size={24} />
              </div>
              <input
                className="w-full bg-transparent border-none py-4 px-4 font-body-base text-body-base text-on-surface focus:ring-0 outline-none"
                placeholder="Ask anything about your data..."
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && execute()}
              />
              <button
                onClick={execute}
                disabled={loading || !question.trim()}
                className="bg-primary text-on-primary px-6 py-4 font-label-caps uppercase tracking-wider hover:bg-surface-tint transition-colors border-l border-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Running…" : "Execute"}
              </button>
            </div>
            <div className="flex gap-2 mt-3 px-2">
              {["Query History", "Saved Prompts"].map((chip) => (
                <span
                  key={chip}
                  className="bg-surface-container-high text-on-surface-variant font-label-caps px-2 py-1 rounded border border-outline-variant/30 hover:bg-surface-variant cursor-pointer transition-colors"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-2 bg-error-container/40 border border-error/30 text-on-error-container rounded-lg p-4">
              <Icon name="error" size={18} className="text-error mt-0.5" />
              <div>
                <p className="font-body-base text-body-base text-on-surface">Query failed</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {error}. Is the backend running on localhost:8000?
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <div className="flex flex-col items-center justify-center text-center gap-2 py-16 text-on-surface-variant">
              <Icon name="query_stats" size={32} className="text-outline" />
              <p className="font-body-base text-body-base text-on-surface">Ask a question to get started</p>
              <p className="font-body-sm text-body-sm max-w-md">
                The agent inspects your schema, writes SQL, and returns an answer with the data.
              </p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="flex flex-col gap-6 w-full animate-fade-in-up">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Answer */}
                <div className="lg:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
                  <PanelHeader icon="lightbulb" title="Answer" />
                  <div className="p-4 flex-grow font-body-sm text-body-sm text-on-surface leading-relaxed">
                    {result.answer || "No answer returned."}
                  </div>
                </div>

                {/* Generated Query */}
                <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
                  <PanelHeader icon="data_object" title="Generated Query">
                    <button
                      className="text-on-surface-variant hover:text-primary transition-colors p-1"
                      title="Copy"
                      onClick={() => navigator.clipboard?.writeText(result.sql)}
                    >
                      <Icon name="content_copy" size={16} />
                    </button>
                  </PanelHeader>
                  <div className="code-block-bg text-gray-300 p-4 font-data-tabular text-data-tabular overflow-x-auto flex-grow custom-scrollbar">
                    <pre>
                      <code>{result.sql || "-- no SQL returned"}</code>
                    </pre>
                  </div>
                </div>
              </div>

              {/* Results table */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col shadow-sm">
                <div className="px-4 py-3 border-b border-outline-variant bg-surface-container flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="font-h3 text-h3 text-on-surface flex items-center gap-2">
                      <Icon name="table_chart" size={16} />
                      Results
                    </h3>
                    <span className="bg-primary/10 text-primary font-label-caps px-2 py-0.5 rounded border border-primary/20">
                      {result.results.length} Rows
                    </span>
                  </div>
                </div>
                {columns.length === 0 ? (
                  <div className="p-6 text-center font-body-sm text-body-sm text-on-surface-variant">
                    The query returned no rows.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead className="bg-surface/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
                        <tr>
                          <th className="font-label-caps text-label-caps text-on-surface-variant px-cell-padding-h py-cell-padding-v border-r border-outline-variant/30 w-12 text-center">
                            #
                          </th>
                          {columns.map((c) => (
                            <th
                              key={c}
                              className="font-label-caps text-label-caps text-on-surface-variant px-cell-padding-h py-cell-padding-v border-r border-outline-variant/30 last:border-r-0"
                            >
                              {c}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="font-data-tabular text-data-tabular text-on-surface divide-y divide-outline-variant/50">
                        {result.results.map((row, idx) => (
                          <tr
                            key={idx}
                            className="hover:bg-surface-container-low/50 transition-colors h-[32px] group"
                          >
                            <td className="px-cell-padding-h py-cell-padding-v border-r border-outline-variant/30 text-on-surface-variant text-center">
                              {idx + 1}
                            </td>
                            {columns.map((c) => (
                              <td
                                key={c}
                                className="px-cell-padding-h py-cell-padding-v border-r border-outline-variant/30 last:border-r-0 group-hover:text-primary transition-colors"
                              >
                                {formatCell(row[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Ask;
