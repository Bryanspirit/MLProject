import React from "react";
import SideNavBar from "../components/SideNavBar";
import TopAppBar from "../components/TopAppBar";
import Icon from "../components/Icon";

/* ----------------------------------------------------------------------------
 * Data
 * ------------------------------------------------------------------------- */

const resultRows = [
  { name: "Coca-Cola Co.", value: "1,245" },
  { name: "PepsiCo Inc.", value: "1,102" },
  { name: "Nestle Waters", value: "843" },
  { name: "Keurig Dr Pepper", value: "756" },
  { name: "Danone", value: "612" },
];

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

function TraceStep({
  label,
  labelColor,
  dot,
  children,
}: {
  label: string;
  labelColor: string;
  dot: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="absolute -left-[21px] top-1">{dot}</div>
      <p className={`font-label-caps text-label-caps mb-1 ${labelColor}`}>{label}</p>
      <p className="font-body-sm text-body-sm text-on-surface">{children}</p>
    </div>
  );
}

const code = "bg-surface-container px-1 py-0.5 rounded text-primary text-[11px]";

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const Ask: React.FC = () => {
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
                defaultValue="Which manufacturers have the most beverage products?"
              />
              <button className="bg-primary text-on-primary px-6 py-4 font-label-caps uppercase tracking-wider hover:bg-surface-tint transition-colors border-l border-primary">
                Execute
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

          {/* Results */}
          <div className="flex flex-col gap-6 w-full animate-fade-in-up">
            {/* Reasoning + query plan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Agent Trace */}
              <div className="lg:col-span-1 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
                <PanelHeader icon="memory" title="Agent Trace">
                  <button className="text-on-surface-variant hover:text-primary transition-colors">
                    <Icon name="open_in_full" size={16} />
                  </button>
                </PanelHeader>
                <div className="p-4 flex-grow overflow-y-auto custom-scrollbar bg-surface-container-low/40">
                  <div className="relative border-l border-outline-variant/50 ml-3 pl-4 pb-4 space-y-6">
                    <TraceStep
                      label="INTENT PARSING"
                      labelColor="text-secondary"
                      dot={<span className="block w-2.5 h-2.5 rounded-full bg-secondary" />}
                    >
                      Extracted entities: <code className={code}>category="beverage"</code>, metric:{" "}
                      <code className={code}>count(product)</code>, grouping:{" "}
                      <code className={code}>manufacturer</code>.
                    </TraceStep>
                    <TraceStep
                      label="SCHEMA MAPPING"
                      labelColor="text-primary"
                      dot={<span className="block w-2.5 h-2.5 rounded-full bg-primary" />}
                    >
                      Mapping "beverage" to{" "}
                      <code className={code}>
                        dim_category.category_name IN ('Beverages', 'Soft Drinks', 'Alcohol')
                      </code>
                      . Found relations: <code className={code}>fact_products</code> →{" "}
                      <code className={code}>dim_manufacturer</code>.
                    </TraceStep>
                    <TraceStep
                      label="SQL GENERATION"
                      labelColor="text-tertiary"
                      dot={<span className="block w-2.5 h-2.5 rounded-full bg-tertiary" />}
                    >
                      Constructing aggregation query with descending order.
                    </TraceStep>
                    <TraceStep
                      label="EXECUTION"
                      labelColor="text-primary"
                      dot={
                        <span className="block w-2.5 h-2.5 rounded-full border-2 border-primary bg-surface-container-lowest" />
                      }
                    >
                      Query executed successfully in 241ms.
                    </TraceStep>
                  </div>
                </div>
              </div>

              {/* Generated Query */}
              <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden flex flex-col">
                <PanelHeader icon="data_object" title="Generated Query">
                  <div className="flex gap-2">
                    <button
                      className="text-on-surface-variant hover:text-primary transition-colors p-1"
                      title="Copy"
                    >
                      <Icon name="content_copy" size={16} />
                    </button>
                    <button
                      className="text-on-surface-variant hover:text-primary transition-colors p-1"
                      title="Edit"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                  </div>
                </PanelHeader>
                <div className="code-block-bg text-gray-300 p-4 font-data-tabular text-data-tabular overflow-x-auto flex-grow custom-scrollbar">
                  <pre>
                    <code>
                      <span className="text-pink-400">SELECT</span>
                      {"\n    m.manufacturer_name,\n    "}
                      <span className="text-blue-400">COUNT</span>
                      {"(p.product_id) "}
                      <span className="text-pink-400">AS</span>
                      {" total_beverage_products\n"}
                      <span className="text-pink-400">FROM</span>
                      {"\n    fact_products p\n"}
                      <span className="text-pink-400">JOIN</span>
                      {"\n    dim_manufacturer m "}
                      <span className="text-pink-400">ON</span>
                      {" p.manufacturer_id = m.id\n"}
                      <span className="text-pink-400">JOIN</span>
                      {"\n    dim_category c "}
                      <span className="text-pink-400">ON</span>
                      {" p.category_id = c.id\n"}
                      <span className="text-pink-400">WHERE</span>
                      {"\n    c.category_group = "}
                      <span className="text-yellow-300">'Beverage'</span>
                      {"\n"}
                      <span className="text-pink-400">GROUP BY</span>
                      {"\n    m.manufacturer_name\n"}
                      <span className="text-pink-400">ORDER BY</span>
                      {"\n    total_beverage_products "}
                      <span className="text-pink-400">DESC</span>
                      {"\n"}
                      <span className="text-pink-400">LIMIT</span>{" "}
                      <span className="text-purple-400">10</span>;
                    </code>
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
                    10 Rows
                  </span>
                </div>
                <button className="flex items-center gap-1 font-label-caps text-on-surface-variant hover:text-primary transition-colors border border-outline-variant rounded px-2 py-1 hover:bg-surface-container">
                  <Icon name="download" size={16} />
                  CSV
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                  <thead className="bg-surface/80 backdrop-blur-md sticky top-0 border-b border-outline-variant">
                    <tr>
                      <th className="font-label-caps text-label-caps text-on-surface-variant px-cell-padding-h py-cell-padding-v border-r border-outline-variant/30 w-12 text-center">
                        #
                      </th>
                      <th className="font-label-caps text-label-caps text-on-surface-variant px-cell-padding-h py-cell-padding-v border-r border-outline-variant/30">
                        Manufacturer Name
                      </th>
                      <th className="font-label-caps text-label-caps text-on-surface-variant px-cell-padding-h py-cell-padding-v text-right">
                        Total Beverage Products
                      </th>
                    </tr>
                  </thead>
                  <tbody className="font-data-tabular text-data-tabular text-on-surface divide-y divide-outline-variant/50">
                    {resultRows.map((row, idx) => (
                      <tr
                        key={row.name}
                        className="hover:bg-surface-container-low/50 transition-colors h-[32px] group"
                      >
                        <td className="px-cell-padding-h py-cell-padding-v border-r border-outline-variant/30 text-on-surface-variant text-center">
                          {idx + 1}
                        </td>
                        <td className="px-cell-padding-h py-cell-padding-v border-r border-outline-variant/30 font-medium group-hover:text-primary transition-colors">
                          {row.name}
                        </td>
                        <td className="px-cell-padding-h py-cell-padding-v text-right">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Ask;
