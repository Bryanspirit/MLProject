"use client";

import {
  LayoutDashboard,
  Upload,
  Box,
  Copy,
  MessageSquare,
  Settings,
  HelpCircle,
} from "lucide-react";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Upload, label: "Upload" },
  { icon: Box, label: "Products" },
  { icon: Copy, label: "Duplicates" },
  { icon: MessageSquare, label: "Ask" },
];

const bottomItems = [
  { icon: Settings, label: "Settings" },
  { icon: HelpCircle, label: "Help" },
];

export default function SideNavBar() {
  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-60 flex-col justify-between bg-surface-container-lowest border-r border-outline-variant py-container-padding px-4">
      {/* Logo */}
      <div>
        <div className="mb-8 px-2">
          <span className="font-h2 text-h2 text-primary">ProductDNA</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Master Data Steward
          </p>
        </div>

        {/* Main nav */}
        <nav className="space-y-1">
          {navItems.map(({ icon: Icon, label, active }) => (
            <button
              key={label}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-body-base text-body-base font-medium transition-colors ${
                active
                  ? "bg-primary-fixed text-primary"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              }`}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom nav */}
      <nav className="space-y-1">
        {bottomItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl font-body-base text-body-base font-medium text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <Icon size={18} strokeWidth={2} />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
