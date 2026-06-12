import React, { useState } from "react";
import SideNavBar from "../components/SideNavBar";
import PageHeader from "../components/PageHeader";
import Icon from "../components/Icon";

/* ----------------------------------------------------------------------------
 * Building blocks
 * ------------------------------------------------------------------------- */

function Toggle({ defaultOn = false, label }: { defaultOn?: boolean; label?: string }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => setOn((v) => !v)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        on ? "bg-primary" : "bg-surface-variant"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-surface-container-lowest shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Section({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 scroll-mt-24"
    >
      <div className="flex items-start gap-3 mb-5 pb-5 border-b border-outline-variant">
        <div className="w-9 h-9 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
          <Icon name={icon} size={20} />
        </div>
        <div>
          <h2 className="font-h2 text-h2 text-on-surface">{title}</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-body-base text-body-base text-on-surface">{label}</p>
        {hint && <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const inputClasses =
  "w-full bg-surface text-on-surface font-body-sm px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-shadow";

const sectionNav = [
  { id: "profile", label: "Profile", icon: "person" },
  { id: "workspace", label: "Workspace", icon: "corporate_fare" },
  { id: "extraction", label: "Extraction", icon: "auto_awesome" },
  { id: "notifications", label: "Notifications", icon: "notifications" },
  { id: "appearance", label: "Appearance", icon: "palette" },
];

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const Settings: React.FC = () => {
  const [theme, setTheme] = useState("light");

  return (
    <div className="bg-background text-on-background font-body-base text-body-base flex min-h-screen">
      <SideNavBar active="Settings" />
      <div className="flex-1 md:ml-60 flex flex-col min-w-0">
        <PageHeader title="Settings" />

        <main className="flex-1 overflow-y-auto p-section-margin">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="font-h1 text-h1 text-on-surface mb-2">Settings</h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Manage your profile, workspace, and how the extraction engine behaves.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
              {/* Section nav */}
              <nav className="lg:w-48 shrink-0">
                <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:sticky lg:top-24">
                  {sectionNav.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#/settings`}
                        onClick={(e) => {
                          e.preventDefault();
                          document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg font-body-sm text-body-sm text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors whitespace-nowrap"
                      >
                        <Icon name={s.icon} size={18} />
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Sections */}
              <div className="flex-1 flex flex-col gap-6 min-w-0">
                <Section
                  id="profile"
                  icon="person"
                  title="Profile"
                  description="Your personal details and how you appear to teammates."
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-h2 text-h2">
                      JD
                    </div>
                    <div className="flex gap-2">
                      <button className="bg-primary text-on-primary font-body-sm px-4 py-2 rounded hover:bg-surface-tint transition-colors">
                        Change photo
                      </button>
                      <button className="border border-outline-variant text-on-surface font-body-sm px-4 py-2 rounded hover:bg-surface-container transition-colors">
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <label className="flex flex-col gap-1">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">
                        Full Name
                      </span>
                      <input className={inputClasses} defaultValue="Jane Doe" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">
                        Email
                      </span>
                      <input className={inputClasses} type="email" defaultValue="jane.doe@company.com" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">
                        Role
                      </span>
                      <input className={inputClasses} defaultValue="Master Data Steward" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">
                        Timezone
                      </span>
                      <select className={`${inputClasses} appearance-none cursor-pointer`} defaultValue="GMT">
                        <option>GMT</option>
                        <option>EST (UTC-5)</option>
                        <option>PST (UTC-8)</option>
                        <option>CET (UTC+1)</option>
                      </select>
                    </label>
                  </div>
                </Section>

                <Section
                  id="workspace"
                  icon="corporate_fare"
                  title="Workspace"
                  description="Organization-wide defaults for the data catalog."
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    <label className="flex flex-col gap-1">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">
                        Organization Name
                      </span>
                      <input className={inputClasses} defaultValue="Acme Retail Group" />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">
                        Default Taxonomy
                      </span>
                      <select className={`${inputClasses} appearance-none cursor-pointer`} defaultValue="GS1 Global">
                        <option>GS1 Global</option>
                        <option>Google Product Taxonomy</option>
                        <option>Custom</option>
                      </select>
                    </label>
                  </div>
                </Section>

                <Section
                  id="extraction"
                  icon="auto_awesome"
                  title="Extraction"
                  description="Control how the AI agent processes and commits records."
                >
                  <div className="divide-y divide-outline-variant">
                    <Row
                      label="Auto-approve high confidence"
                      hint="Commit records above the confidence threshold without manual review."
                    >
                      <Toggle defaultOn label="Auto-approve high confidence" />
                    </Row>
                    <Row
                      label="Auto-merge exact duplicates"
                      hint="Merge pairs with a 100% match score automatically."
                    >
                      <Toggle label="Auto-merge exact duplicates" />
                    </Row>
                    <Row
                      label="Confidence threshold"
                      hint="Minimum score required for auto-approval."
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          defaultValue={90}
                          className="w-20 bg-surface text-on-surface font-data-tabular px-3 py-2 border border-outline-variant rounded focus:outline-none focus:ring-1 focus:ring-primary text-right"
                        />
                        <span className="font-data-tabular text-on-surface-variant">%</span>
                      </div>
                    </Row>
                  </div>
                </Section>

                <Section
                  id="notifications"
                  icon="notifications"
                  title="Notifications"
                  description="Choose what you want to be alerted about."
                >
                  <div className="divide-y divide-outline-variant">
                    <Row label="Email notifications" hint="Receive activity summaries by email.">
                      <Toggle defaultOn label="Email notifications" />
                    </Row>
                    <Row label="Duplicate alerts" hint="Notify when new high-confidence duplicates are found.">
                      <Toggle defaultOn label="Duplicate alerts" />
                    </Row>
                    <Row label="Weekly digest" hint="A Monday-morning roundup of extraction stats.">
                      <Toggle label="Weekly digest" />
                    </Row>
                  </div>
                </Section>

                <Section
                  id="appearance"
                  icon="palette"
                  title="Appearance"
                  description="Personalize the look of your workspace."
                >
                  <Row label="Theme" hint="Select your preferred color scheme.">
                    <div className="flex gap-1 bg-surface-container p-1 rounded-lg">
                      {[
                        { id: "light", icon: "light_mode", label: "Light" },
                        { id: "dark", icon: "dark_mode", label: "Dark" },
                        { id: "system", icon: "computer", label: "System" },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setTheme(opt.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-body-sm text-body-sm transition-colors ${
                            theme === opt.id
                              ? "bg-surface-container-lowest text-primary shadow-sm"
                              : "text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          <Icon name={opt.icon} size={16} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </Row>
                </Section>

                {/* Save bar */}
                <div className="flex justify-end gap-3 pt-2">
                  <button className="border border-outline-variant text-on-surface font-body-sm px-5 py-2.5 rounded hover:bg-surface-container transition-colors">
                    Cancel
                  </button>
                  <button className="bg-primary text-on-primary font-body-sm px-5 py-2.5 rounded shadow-sm hover:bg-surface-tint transition-colors font-medium">
                    Save changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
